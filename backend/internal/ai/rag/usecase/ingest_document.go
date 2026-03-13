package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ai/rag/storage"
	"github.com/finch-co/cashflow/internal/ai/rag/domain"
)

// IngestDocumentUseCase handles document ingestion workflow
type IngestDocumentUseCase struct {
	documentRepo domain.DocumentRepository
	storage      storage.FileStorage
	chunkUseCase *ChunkDocumentUseCase
}

// NewIngestDocumentUseCase creates a new document ingestion use case
func NewIngestDocumentUseCase(
	documentRepo domain.DocumentRepository,
	fileStorage storage.FileStorage,
	chunkUseCase *ChunkDocumentUseCase,
) *IngestDocumentUseCase {
	return &IngestDocumentUseCase{
		documentRepo: documentRepo,
		storage:      fileStorage,
		chunkUseCase: chunkUseCase,
	}
}

// IngestDocumentInput represents input for document ingestion
type IngestDocumentInput struct {
	TenantID   uuid.UUID
	Title      string
	Type       domain.DocumentType
	FileData   []byte
	FileName   string
	MimeType   string
	UploadedBy uuid.UUID
}

// Execute ingests a document with file storage and async chunking
func (uc *IngestDocumentUseCase) Execute(ctx context.Context, input IngestDocumentInput) (*domain.Document, error) {
	// Validate file type
	if err := uc.validateFileType(input.MimeType); err != nil {
		return nil, err
	}

	// Create document record first (status = processing)
	createInput := domain.CreateDocumentInput{
		TenantID:   input.TenantID,
		Title:      input.Title,
		Type:       input.Type,
		FileName:   input.FileName,
		MimeType:   input.MimeType,
		UploadedBy: input.UploadedBy,
	}

	doc, err := uc.documentRepo.Create(ctx, createInput)
	if err != nil {
		return nil, fmt.Errorf("failed to create document record: %w", err)
	}

	// Store file to disk
	filePath, err := uc.storage.Store(ctx, input.TenantID, doc.ID, input.FileData, input.FileName)
	if err != nil {
		return nil, fmt.Errorf("failed to store file: %w", err)
	}

	log.Info().
		Str("document_id", doc.ID.String()).
		Str("tenant_id", input.TenantID.String()).
		Str("file_path", filePath).
		Msg("Document file stored successfully")

	// Trigger async chunking in background
	go func() {
		chunkInput := ChunkDocumentInput{
			TenantID:   input.TenantID,
			DocumentID: doc.ID,
			FilePath:   filePath,
			MimeType:   input.MimeType,
		}

		if err := uc.chunkUseCase.Execute(context.Background(), chunkInput); err != nil {
			log.Error().
				Err(err).
				Str("document_id", doc.ID.String()).
				Str("tenant_id", input.TenantID.String()).
				Msg("Failed to chunk document")
		}
	}()

	return doc, nil
}

// validateFileType validates the MIME type
func (uc *IngestDocumentUseCase) validateFileType(mimeType string) error {
	validTypes := map[string]bool{
		"application/pdf": true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		"text/plain": true,
	}

	mimeType = strings.ToLower(strings.TrimSpace(mimeType))
	if !validTypes[mimeType] {
		return fmt.Errorf("unsupported file type: %s (supported: PDF, DOCX, TXT)", mimeType)
	}

	return nil
}
