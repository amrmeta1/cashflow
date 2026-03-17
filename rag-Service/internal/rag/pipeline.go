package rag

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	pgvector "github.com/pgvector/pgvector-go"
	"tadfuq/rag-service/internal/db"
	"tadfuq/rag-service/internal/embeddings"
	"tadfuq/rag-service/internal/llm"
	"tadfuq/rag-service/internal/models"
	"tadfuq/rag-service/internal/processor"
)

// Pipeline orchestrates the full RAG workflow
type Pipeline struct {
	db        *db.DB
	embedder  *embeddings.Client
	claude    *llm.Client
	processor *processor.Processor
	chunker   *Chunker
	topK      int
}

// Config configures the pipeline
type Config struct {
	TopK         int
	ChunkSize    int
	ChunkOverlap int
}

// New creates a new RAG pipeline
func New(database *db.DB, embedder *embeddings.Client, claudeClient *llm.Client, cfg Config) *Pipeline {
	chunkerCfg := ChunkerConfig{
		ChunkSize:    cfg.ChunkSize,
		ChunkOverlap: cfg.ChunkOverlap,
	}
	if chunkerCfg.ChunkSize == 0 {
		chunkerCfg = DefaultConfig()
	}
	topK := cfg.TopK
	if topK == 0 {
		topK = 5
	}

	return &Pipeline{
		db:        database,
		embedder:  embedder,
		claude:    claudeClient,
		processor: processor.New(claudeClient),
		chunker:   NewChunker(chunkerCfg),
		topK:      topK,
	}
}

// IngestDocument processes and stores a document
func (p *Pipeline) IngestDocument(ctx context.Context, req *models.IngestRequest) (*models.Document, error) {
	// 1. Extract text from document
	fmt.Printf("[ingest] Processing %s (%s)...\n", req.FileName, req.FileType)
	processed, err := p.processor.Process(ctx, req.FileName, req.Data)
	if err != nil {
		return nil, fmt.Errorf("processing document: %w", err)
	}
	fmt.Printf("[ingest] Extracted %d chars from %d pages\n", len(processed.Text), processed.PageCount)

	// 2. Save document record
	doc := &models.Document{
		ID:        req.DocumentID,
		Name:      req.FileName,
		FileType:  req.FileType,
		FileSize:  req.FileSize,
		PageCount: processed.PageCount,
		Metadata:  map[string]interface{}{},
	}
	if err := p.db.CreateDocument(ctx, doc); err != nil {
		return nil, fmt.Errorf("saving document: %w", err)
	}

	// 3. Chunk the document
	rawChunks := p.chunker.ChunkPages(processed.Pages)
	if len(rawChunks) == 0 {
		return nil, fmt.Errorf("no chunks generated from document")
	}
	fmt.Printf("[ingest] Created %d chunks\n", len(rawChunks))

	// 4. Embed all chunks
	texts := make([]string, len(rawChunks))
	for i, c := range rawChunks {
		texts[i] = c.Content
	}
	embeddingVecs, err := p.embedder.EmbedDocuments(ctx, texts)
	if err != nil {
		// Rollback: delete the document (cascade deletes chunks)
		_ = p.db.DeleteDocument(ctx, doc.ID)
		return nil, fmt.Errorf("embedding chunks: %w", err)
	}

	// 5. Build chunk models
	chunks := make([]models.Chunk, len(rawChunks))
	for i, rc := range rawChunks {
		chunks[i] = models.Chunk{
			ID:         uuid.New(),
			DocumentID: doc.ID,
			Content:    rc.Content,
			ChunkIndex: rc.Index,
			PageNumber: rc.PageNumber,
			Embedding:  pgvector.NewVector(embeddingVecs[i]),
			Metadata:   map[string]interface{}{},
		}
	}

	// 6. Store chunks in DB
	if err := p.db.CreateChunks(ctx, chunks); err != nil {
		_ = p.db.DeleteDocument(ctx, doc.ID)
		return nil, fmt.Errorf("storing chunks: %w", err)
	}

	fmt.Printf("[ingest] ✓ Document '%s' ingested successfully with %d chunks\n", req.FileName, len(chunks))
	return doc, nil
}

// Chat answers a question using RAG
func (p *Pipeline) Chat(ctx context.Context, req *models.ChatRequest) (*models.ChatResponse, error) {
	// 1. Embed the query
	queryVec, err := p.embedder.EmbedQuery(ctx, req.Question)
	if err != nil {
		return nil, fmt.Errorf("embedding query: %w", err)
	}

	// 2. Similarity search
	similar, err := p.db.SimilaritySearch(ctx, pgvector.NewVector(queryVec), p.topK)
	if err != nil {
		return nil, fmt.Errorf("similarity search: %w", err)
	}

	if len(similar) == 0 {
		return &models.ChatResponse{
			Answer:  "I couldn't find relevant information in the ingested documents to answer your question.",
			Sources: []models.SimilarChunk{},
		}, nil
	}

	// 3. Build context from retrieved chunks
	contextStr := buildContext(similar)

	// 4. Get or create chat session
	var sessionID uuid.UUID
	var history []llm.Message

	if req.SessionID != nil {
		sessionID = *req.SessionID
		msgs, err := p.db.GetChatHistory(ctx, sessionID, 10)
		if err == nil {
			for _, m := range msgs {
				history = append(history, llm.Message{Role: m.Role, Content: m.Content})
			}
		}
	} else {
		sess, err := p.db.CreateChatSession(ctx, "session-"+uuid.New().String()[:8])
		if err != nil {
			return nil, fmt.Errorf("creating session: %w", err)
		}
		sessionID = sess.ID
	}

	// 5. Generate answer with Claude
	answer, err := p.claude.Chat(ctx, req.Question, contextStr, history)
	if err != nil {
		return nil, fmt.Errorf("claude chat: %w", err)
	}

	// 6. Save messages to session
	userMsg := &models.ChatMessage{
		ID: uuid.New(), SessionID: sessionID, Role: "user", Content: req.Question,
		Metadata: map[string]interface{}{},
	}
	assistantMsg := &models.ChatMessage{
		ID: uuid.New(), SessionID: sessionID, Role: "assistant", Content: answer,
		Metadata: map[string]interface{}{"sources_count": len(similar)},
	}
	_ = p.db.AddChatMessage(ctx, userMsg)
	_ = p.db.AddChatMessage(ctx, assistantMsg)

	return &models.ChatResponse{
		SessionID: sessionID,
		Answer:    answer,
		Sources:   similar,
	}, nil
}

// ExtractStructured extracts structured financial data from a document
func (p *Pipeline) ExtractStructured(ctx context.Context, docID uuid.UUID) (*models.ExtractionResult, error) {
	doc, err := p.db.GetDocument(ctx, docID)
	if err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}

	// Get all chunks for this document to reconstruct full text
	// We'll do a broad search using a financial context query
	queryVec, _ := p.embedder.EmbedQuery(ctx, "financial statements revenue expenses assets liabilities")
	similar, err := p.db.SimilaritySearch(ctx, pgvector.NewVector(queryVec), 20)
	if err != nil {
		return nil, err
	}

	// Filter to only this document's chunks
	var relevantChunks []string
	for _, s := range similar {
		if s.DocumentID == docID {
			relevantChunks = append(relevantChunks, s.Content)
		}
	}

	if len(relevantChunks) == 0 {
		return nil, fmt.Errorf("no content found for document")
	}

	fullText := strings.Join(relevantChunks, "\n\n")
	jsonStr, err := p.claude.ExtractStructured(ctx, fullText)
	if err != nil {
		return nil, fmt.Errorf("structured extraction: %w", err)
	}

	return &models.ExtractionResult{
		DocumentID:   docID,
		DocumentName: doc.Name,
		RawText:      jsonStr,
	}, nil
}

// ListDocuments returns all documents
func (p *Pipeline) ListDocuments(ctx context.Context) ([]models.Document, error) {
	return p.db.ListDocuments(ctx)
}

// DeleteDocument removes a document and its chunks
func (p *Pipeline) DeleteDocument(ctx context.Context, id uuid.UUID) error {
	return p.db.DeleteDocument(ctx, id)
}

// buildContext formats retrieved chunks into a context string for the LLM
func buildContext(chunks []models.SimilarChunk) string {
	var sb strings.Builder
	for i, chunk := range chunks {
		sb.WriteString(fmt.Sprintf("[Source %d: %s (Page %d, Similarity: %.2f%%)]:\n",
			i+1, chunk.DocumentName, chunk.PageNumber, chunk.Similarity*100))
		sb.WriteString(chunk.Content)
		sb.WriteString("\n\n---\n\n")
	}
	return sb.String()
}
