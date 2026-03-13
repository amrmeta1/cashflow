package rag

import (
	"context"
	"fmt"
	"strings"

	chunkerservice "tadfuq/rag-service/internal/service"

	"github.com/google/uuid"
)

// ----------------------------------------------------------------
// Service interface (input port / use-case boundary)
// ----------------------------------------------------------------

// Service is the primary port callers (HTTP handlers, CLI) use.
// It exposes only the operations allowed in Phase 1.
type Service interface {
	// IngestDocument parses, chunks, embeds, and stores one document.
	// Returns the persisted Document on success.
	IngestDocument(ctx context.Context, req UploadRequest) (*Document, error)

	// Query answers a question using tenant-scoped vector retrieval.
	// Returns the answer plus citations (source chunks).
	Query(ctx context.Context, req QueryRequest) (*QueryResult, error)

	// ListDocuments returns all documents ingested for a tenant.
	ListDocuments(ctx context.Context, tenantID uuid.UUID) ([]Document, error)

	// DeleteDocument removes a document and all its chunks.
	DeleteDocument(ctx context.Context, tenantID, docID uuid.UUID) error
}

// ----------------------------------------------------------------
// Service implementation
// ----------------------------------------------------------------

// ServiceConfig holds tuning parameters injected at construction.
type ServiceConfig struct {
	ChunkSize    int
	ChunkOverlap int
	TopK         int
}

type service struct {
	docs     DocumentRepository
	chunks   ChunkRepository
	sessions SessionRepository
	embedder Embedder
	llm      LLM
	parser   Parser
	chunker  *chunkerservice.Chunker
	topK     int
}

// NewService constructs the RAG use-case implementation.
// All dependencies are injected via their domain interfaces —
// no infrastructure package is imported.
func NewService(
	docs DocumentRepository,
	chunks ChunkRepository,
	sessions SessionRepository,
	embedder Embedder,
	llm LLM,
	parser Parser,
	cfg ServiceConfig,
) Service {
	topK := cfg.TopK
	if topK <= 0 {
		topK = 5
	}

	// Initialize new financial-aware chunker
	chunkerConfig := chunkerservice.ChunkerConfig{
		TextTargetTokens:  700,
		TextOverlapTokens: 50,
		TableRowsPerChunk: 20,
	}
	if cfg.ChunkSize > 0 {
		chunkerConfig.TextTargetTokens = cfg.ChunkSize
	}
	if cfg.ChunkOverlap > 0 {
		chunkerConfig.TextOverlapTokens = cfg.ChunkOverlap
	}

	return &service{
		docs:     docs,
		chunks:   chunks,
		sessions: sessions,
		embedder: embedder,
		llm:      llm,
		parser:   parser,
		chunker:  chunkerservice.NewChunker(chunkerConfig),
		topK:     topK,
	}
}

// ----------------------------------------------------------------
// Use case: IngestDocument
// ----------------------------------------------------------------

func (s *service) IngestDocument(ctx context.Context, req UploadRequest) (*Document, error) {
	// 1. Guard: verify tenant exists
	ok, err := s.docs.TenantExists(ctx, req.TenantID)
	if err != nil {
		return nil, fmt.Errorf("rag.IngestDocument: checking tenant: %w", err)
	}
	if !ok {
		return nil, ErrTenantNotFound
	}

	// 2. Guard: category must be in the allowed RAG set
	if !AllowedCategories[req.Category] {
		return nil, ErrForbiddenCategory
	}

	// 3. Persist the document record in "processing" state
	doc := &Document{
		ID:       uuid.New(),
		TenantID: req.TenantID,
		Name:     req.FileName,
		FileType: req.FileType,
		Category: req.Category,
		FileSize: req.FileSize,
		Status:   StatusProcessing,
		Metadata: map[string]any{},
	}
	if err := s.docs.Save(ctx, doc); err != nil {
		return nil, fmt.Errorf("rag.IngestDocument: saving document record: %w", err)
	}

	// 4. Parse the binary file into pages
	parsed, err := s.parser.Parse(ctx, req.FileName, req.Data)
	if err != nil {
		_ = s.docs.UpdateStatus(ctx, req.TenantID, doc.ID, StatusFailed)
		return nil, fmt.Errorf("rag.IngestDocument: parsing: %w", err)
	}
	if len(parsed.Pages) == 0 {
		_ = s.docs.UpdateStatus(ctx, req.TenantID, doc.ID, StatusFailed)
		return nil, ErrEmptyDocument
	}
	doc.PageCount = parsed.PageCount

	// 5. Chunk the pages with financial-aware chunking
	chunkResults := s.chunker.ChunkDocument(parsed.Pages, doc.ID, parsed.SourceType, parsed.SheetNames)
	if len(chunkResults) == 0 {
		_ = s.docs.UpdateStatus(ctx, req.TenantID, doc.ID, StatusFailed)
		return nil, ErrEmptyDocument
	}

	// 6. Embed all chunks (voyage-finance-2)
	texts := make([]string, len(chunkResults))
	for i, cr := range chunkResults {
		texts[i] = cr.Content
	}
	vectors, err := s.embedder.EmbedDocuments(ctx, texts)
	if err != nil {
		_ = s.docs.UpdateStatus(ctx, req.TenantID, doc.ID, StatusFailed)
		return nil, fmt.Errorf("rag.IngestDocument: embedding: %w", err)
	}

	// 7. Build domain Chunk objects with rich metadata
	domainChunks := make([]Chunk, len(chunkResults))
	for i, cr := range chunkResults {
		// Build metadata map from ChunkMetadata
		metadata := map[string]any{
			"section_type": cr.Metadata.SectionType,
			"source_page":  cr.Metadata.SourcePage,
			"token_count":  cr.Metadata.TokenCount,
			"char_start":   cr.Metadata.CharStart,
			"char_end":     cr.Metadata.CharEnd,
		}

		// Add table-specific metadata
		if cr.Metadata.RowStart != nil {
			metadata["row_start"] = *cr.Metadata.RowStart
		}
		if cr.Metadata.RowEnd != nil {
			metadata["row_end"] = *cr.Metadata.RowEnd
		}
		if cr.Metadata.SheetName != nil {
			metadata["sheet_name"] = *cr.Metadata.SheetName
		}
		if cr.Metadata.TableName != nil {
			metadata["table_name"] = *cr.Metadata.TableName
		}
		if len(cr.Metadata.ColumnHeaders) > 0 {
			metadata["column_headers"] = cr.Metadata.ColumnHeaders
		}

		domainChunks[i] = Chunk{
			ID:         uuid.New(),
			TenantID:   req.TenantID,
			DocumentID: doc.ID,
			Content:    cr.Content,
			ChunkIndex: i,
			PageNumber: cr.Metadata.SourcePage,
			Embedding:  vectors[i],
			Metadata:   metadata,
		}
	}

	// 8. Batch-insert chunks
	if err := s.chunks.SaveBatch(ctx, domainChunks); err != nil {
		_ = s.docs.UpdateStatus(ctx, req.TenantID, doc.ID, StatusFailed)
		return nil, fmt.Errorf("rag.IngestDocument: saving chunks: %w", err)
	}

	// 9. Mark document as ready; persist updated page count
	doc.Status = StatusReady
	if err := s.docs.Save(ctx, doc); err != nil {
		return nil, fmt.Errorf("rag.IngestDocument: finalising document: %w", err)
	}

	return doc, nil
}

// ----------------------------------------------------------------
// Use case: Query
// ----------------------------------------------------------------

func (s *service) Query(ctx context.Context, req QueryRequest) (*QueryResult, error) {
	fmt.Printf("[RAG Query] Starting query for tenant %s: %s\n", req.TenantID, req.Question)

	// 1. Guard: tenant must exist
	ok, err := s.docs.TenantExists(ctx, req.TenantID)
	if err != nil {
		fmt.Printf("[RAG Query] Error checking tenant: %v\n", err)
		return nil, fmt.Errorf("rag.Query: checking tenant: %w", err)
	}
	if !ok {
		fmt.Printf("[RAG Query] Tenant not found: %s\n", req.TenantID)
		return nil, ErrTenantNotFound
	}
	fmt.Printf("[RAG Query] Tenant exists\n")

	// 2. Embed the query
	fmt.Printf("[RAG Query] Embedding query...\n")
	queryVec, err := s.embedder.EmbedQuery(ctx, req.Question)
	if err != nil {
		fmt.Printf("[RAG Query] Error embedding query: %v\n", err)
		return nil, fmt.Errorf("rag.Query: embedding query: %w", err)
	}
	fmt.Printf("[RAG Query] Query embedded successfully, vector length: %d\n", len(queryVec))

	// 3. Tenant-scoped similarity search
	fmt.Printf("[RAG Query] Searching for similar chunks...\n")
	scored, err := s.chunks.SearchSimilar(ctx, req.TenantID, queryVec, s.topK)
	if err != nil {
		fmt.Printf("[RAG Query] Error in similarity search: %v\n", err)
		return nil, fmt.Errorf("rag.Query: similarity search: %w", err)
	}
	fmt.Printf("[RAG Query] Found %d similar chunks\n", len(scored))

	if len(scored) == 0 {
		fmt.Printf("[RAG Query] No chunks found, returning default message\n")
		return &QueryResult{
			Answer:    "I could not find relevant information in your documents to answer this question.",
			Citations: []Citation{},
			TenantID:  req.TenantID,
		}, nil
	}

	// 4. Get / create session + load history
	fmt.Printf("[RAG Query] Managing session...\n")
	var sessionID uuid.UUID
	var history []LLMMessage

	if req.SessionID != nil {
		sessionID = *req.SessionID
		history, _ = s.sessions.GetHistory(ctx, req.TenantID, sessionID, 10)
	} else {
		sessionID, err = s.sessions.CreateSession(ctx, req.TenantID, "")
		if err != nil {
			fmt.Printf("[RAG Query] Error creating session: %v\n", err)
			return nil, fmt.Errorf("rag.Query: creating session: %w", err)
		}
	}
	fmt.Printf("[RAG Query] Session ID: %s\n", sessionID)

	// 5. Build grounded context for the LLM
	contextText := buildContext(scored)
	fmt.Printf("[RAG Query] Context built, length: %d chars\n", len(contextText))

	// 6. Generate answer — only grounded in the retrieved context
	fmt.Printf("[RAG Query] Calling LLM for answer...\n")
	answer, err := s.llm.Answer(ctx, req.Question, contextText, history)
	if err != nil {
		fmt.Printf("[RAG Query] Error from LLM: %v\n", err)
		return nil, fmt.Errorf("rag.Query: llm answer: %w", err)
	}
	fmt.Printf("[RAG Query] LLM answer received, length: %d chars\n", len(answer))

	// 7. Persist conversation turn
	_ = s.sessions.SaveMessage(ctx, sessionID, req.TenantID, "user", req.Question)
	_ = s.sessions.SaveMessage(ctx, sessionID, req.TenantID, "assistant", answer)

	// 8. Build citations
	citations := makeCitations(scored)

	return &QueryResult{
		Answer:    answer,
		Citations: citations,
		SessionID: sessionID,
		TenantID:  req.TenantID,
	}, nil
}

func (s *service) ListDocuments(ctx context.Context, tenantID uuid.UUID) ([]Document, error) {
	ok, err := s.docs.TenantExists(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrTenantNotFound
	}
	return s.docs.ListByTenant(ctx, tenantID)
}

func (s *service) DeleteDocument(ctx context.Context, tenantID, docID uuid.UUID) error {
	return s.docs.Delete(ctx, tenantID, docID)
}

// ----------------------------------------------------------------
// Helpers (pure, no I/O)
// ----------------------------------------------------------------

func buildContext(chunks []ScoredChunk) string {
	var sb strings.Builder
	for i, c := range chunks {
		sb.WriteString(fmt.Sprintf(
			"[Source %d | %s | page %d | %.0f%% match]\n%s\n\n",
			i+1, c.DocumentName, c.PageNumber, c.Similarity*100, c.Content,
		))
	}
	return sb.String()
}

func makeCitations(chunks []ScoredChunk) []Citation {
	out := make([]Citation, len(chunks))
	for i, c := range chunks {
		excerpt := c.Content
		if len(excerpt) > 300 {
			excerpt = excerpt[:300] + "…"
		}
		out[i] = Citation{
			DocumentID:   c.DocumentID,
			DocumentName: c.DocumentName,
			PageNumber:   c.PageNumber,
			ChunkIndex:   c.ChunkIndex,
			Excerpt:      excerpt,
			Similarity:   c.Similarity,
		}
	}
	return out
}

// splitSentences splits on sentence boundaries, preserving tables & newlines.
func splitSentences(text string) []string {
	var sentences []string
	var cur strings.Builder
	runes := []rune(text)
	for i, r := range runes {
		cur.WriteRune(r)
		if r == '\n' && cur.Len() > 40 {
			sentences = append(sentences, cur.String())
			cur.Reset()
			continue
		}
		if (r == '.' || r == '!' || r == '?') && i+1 < len(runes) {
			next := runes[i+1]
			if (next == ' ' || next == '\n') && cur.Len() > 20 {
				sentences = append(sentences, cur.String())
				cur.Reset()
			}
		}
	}
	if rest := strings.TrimSpace(cur.String()); rest != "" {
		sentences = append(sentences, rest)
	}
	return sentences
}

func overlapIndex(sentences []string, overlapSize int) int {
	total := 0
	for i := len(sentences) - 1; i >= 0; i-- {
		total += len(sentences[i])
		if total >= overlapSize {
			return i
		}
	}
	return 0
}

func normaliseText(s string) string {
	var sb strings.Builder
	prev := false
	for _, r := range s {
		if r == ' ' || r == '\t' || r == '\r' {
			if !prev {
				sb.WriteRune(' ')
			}
			prev = true
		} else {
			sb.WriteRune(r)
			prev = false
		}
	}
	return strings.TrimSpace(sb.String())
}
