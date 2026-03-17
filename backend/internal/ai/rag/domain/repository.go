package domain

import (
	"context"

	"github.com/google/uuid"
)

// DocumentRepository defines persistence operations for documents
type DocumentRepository interface {
	Create(ctx context.Context, input CreateDocumentInput) (*Document, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Document, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]Document, int, error)
	Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateDocumentInput) (*Document, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
}

// ChunkRepository defines persistence operations for document chunks
type ChunkRepository interface {
	Create(ctx context.Context, input CreateChunkInput) (*DocumentChunk, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*DocumentChunk, error)
	ListByDocument(ctx context.Context, tenantID, documentID uuid.UUID) ([]DocumentChunk, error)
	UpdateEmbedding(ctx context.Context, tenantID, chunkID uuid.UUID, embedding []float32) error
	SearchSimilar(ctx context.Context, tenantID uuid.UUID, embedding []float32, limit int) ([]ChunkSearchResult, error)
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
}

// QueryRepository defines persistence operations for RAG queries
type QueryRepository interface {
	Create(ctx context.Context, input CreateQueryInput) (*RagQuery, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*RagQuery, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]RagQuery, int, error)
}
