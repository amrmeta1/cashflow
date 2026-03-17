package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ai/rag/parsers"
	"github.com/finch-co/cashflow/internal/ai/rag/storage"
	"github.com/finch-co/cashflow/internal/ai/rag/domain"
)

// ChunkDocumentUseCase handles document chunking workflow
type ChunkDocumentUseCase struct {
	documentRepo     domain.DocumentRepository
	chunkRepo        domain.ChunkRepository
	storage          storage.FileStorage
	pdfParser        parser.PDFParser
	docxParser       parser.DOCXParser
	textParser       parser.TextParser
	chunker          TextChunker
	embeddingUseCase *EmbedChunksUseCase
}

// NewChunkDocumentUseCase creates a new document chunking use case
func NewChunkDocumentUseCase(
	documentRepo domain.DocumentRepository,
	chunkRepo domain.ChunkRepository,
	fileStorage storage.FileStorage,
	pdfParser parser.PDFParser,
	docxParser parser.DOCXParser,
	textParser parser.TextParser,
	chunker TextChunker,
	embeddingUseCase *EmbedChunksUseCase,
) *ChunkDocumentUseCase {
	return &ChunkDocumentUseCase{
		documentRepo:     documentRepo,
		chunkRepo:        chunkRepo,
		storage:          fileStorage,
		pdfParser:        pdfParser,
		docxParser:       docxParser,
		textParser:       textParser,
		chunker:          chunker,
		embeddingUseCase: embeddingUseCase,
	}
}

// ChunkDocumentInput represents input for document chunking
type ChunkDocumentInput struct {
	TenantID   uuid.UUID
	DocumentID uuid.UUID
	FilePath   string
	MimeType   string
}

// Execute chunks a document into smaller segments
func (uc *ChunkDocumentUseCase) Execute(ctx context.Context, input ChunkDocumentInput) error {
	log.Info().
		Str("document_id", input.DocumentID.String()).
		Str("tenant_id", input.TenantID.String()).
		Msg("Starting document chunking")

	// Retrieve file from storage
	fileData, err := uc.storage.Retrieve(ctx, input.FilePath)
	if err != nil {
		return uc.updateDocumentStatus(ctx, input.TenantID, input.DocumentID, domain.DocumentStatusFailed)
	}

	// Parse document based on MIME type
	text, err := uc.parseDocument(ctx, fileData, input.MimeType)
	if err != nil {
		log.Error().Err(err).Str("document_id", input.DocumentID.String()).Msg("Failed to parse document")
		return uc.updateDocumentStatus(ctx, input.TenantID, input.DocumentID, domain.DocumentStatusFailed)
	}

	// Chunk text
	chunks, err := uc.chunker.Chunk(text)
	if err != nil {
		log.Error().Err(err).Str("document_id", input.DocumentID.String()).Msg("Failed to chunk text")
		return uc.updateDocumentStatus(ctx, input.TenantID, input.DocumentID, domain.DocumentStatusFailed)
	}

	// Store chunks in database
	for i, chunkText := range chunks {
		chunkInput := domain.CreateChunkInput{
			TenantID:   input.TenantID,
			DocumentID: input.DocumentID,
			Index:      i,
			Content:    chunkText,
			Metadata: map[string]any{
				"file_path": input.FilePath,
			},
		}

		if _, err := uc.chunkRepo.Create(ctx, chunkInput); err != nil {
			log.Error().
				Err(err).
				Str("document_id", input.DocumentID.String()).
				Int("chunk_index", i).
				Msg("Failed to store chunk")
			return uc.updateDocumentStatus(ctx, input.TenantID, input.DocumentID, domain.DocumentStatusFailed)
		}
	}

	log.Info().
		Str("document_id", input.DocumentID.String()).
		Int("chunk_count", len(chunks)).
		Msg("Document chunking completed, starting embedding generation")

	// Generate embeddings for chunks
	if uc.embeddingUseCase != nil {
		embeddingInput := EmbedChunksInput{
			TenantID:   input.TenantID,
			DocumentID: input.DocumentID,
		}

		if err := uc.embeddingUseCase.Execute(ctx, embeddingInput); err != nil {
			log.Error().
				Err(err).
				Str("document_id", input.DocumentID.String()).
				Msg("Failed to generate embeddings, but chunks are stored")
			// Don't fail the entire process if embeddings fail
			// Document status will still be set to ready
		}
	} else {
		log.Warn().
			Str("document_id", input.DocumentID.String()).
			Msg("Embedding use case not configured, skipping embedding generation")
	}

	// Update document status to ready
	if err := uc.updateDocumentStatus(ctx, input.TenantID, input.DocumentID, domain.DocumentStatusReady); err != nil {
		return err
	}

	log.Info().
		Str("document_id", input.DocumentID.String()).
		Int("chunk_count", len(chunks)).
		Msg("Document processing completed successfully")

	return nil
}

// parseDocument parses document based on MIME type
func (uc *ChunkDocumentUseCase) parseDocument(ctx context.Context, data []byte, mimeType string) (string, error) {
	mimeType = strings.ToLower(strings.TrimSpace(mimeType))

	switch mimeType {
	case "application/pdf":
		return uc.pdfParser.Parse(ctx, data)
	case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		return uc.docxParser.Parse(ctx, data)
	case "text/plain":
		return uc.textParser.Parse(ctx, data)
	default:
		return "", fmt.Errorf("unsupported MIME type: %s", mimeType)
	}
}

// updateDocumentStatus updates the document status
func (uc *ChunkDocumentUseCase) updateDocumentStatus(ctx context.Context, tenantID, documentID uuid.UUID, status domain.DocumentStatus) error {
	updateInput := domain.UpdateDocumentInput{
		Status: &status,
	}

	_, err := uc.documentRepo.Update(ctx, tenantID, documentID, updateInput)
	if err != nil {
		log.Error().
			Err(err).
			Str("document_id", documentID.String()).
			Str("status", string(status)).
			Msg("Failed to update document status")
		return fmt.Errorf("failed to update document status: %w", err)
	}

	return nil
}
