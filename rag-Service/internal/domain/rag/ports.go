package rag

import (
	"context"

	"github.com/google/uuid"
)

// ----------------------------------------------------------------
// Output ports  (secondary / driven adapters)
// Interfaces are defined HERE in the domain so that the domain
// never imports infrastructure packages.
// ----------------------------------------------------------------

// DocumentRepository persists and retrieves Document aggregates.
// ALL methods are tenant-scoped: callers must supply a tenantID.
type DocumentRepository interface {
	// Save creates or fully replaces a Document record.
	Save(ctx context.Context, doc *Document) error

	// UpdateStatus changes the processing status of a document.
	UpdateStatus(ctx context.Context, tenantID, docID uuid.UUID, status DocumentStatus) error

	// FindByID returns a Document only if it belongs to tenantID.
	FindByID(ctx context.Context, tenantID, docID uuid.UUID) (*Document, error)

	// ListByTenant returns all documents for tenantID, newest first.
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Document, error)

	// Delete removes a document (implementation must cascade to chunks).
	Delete(ctx context.Context, tenantID, docID uuid.UUID) error

	// TenantExists returns true when tenantID is found and active.
	TenantExists(ctx context.Context, tenantID uuid.UUID) (bool, error)
}

// ChunkRepository persists and retrieves Chunk objects.
// tenant_id is part of every chunk row so every method is
// automatically tenant-isolated without a JOIN.
type ChunkRepository interface {
	// SaveBatch inserts a slice of pre-embedded chunks in one transaction.
	SaveBatch(ctx context.Context, chunks []Chunk) error

	// SearchSimilar returns the top-k chunks closest to the query
	// embedding, restricted to tenantID.
	SearchSimilar(
		ctx context.Context,
		tenantID uuid.UUID,
		embedding []float32,
		topK int,
	) ([]ScoredChunk, error)
}

// SessionRepository persists conversation history.
type SessionRepository interface {
	// CreateSession opens a new query session for the tenant.
	CreateSession(ctx context.Context, tenantID uuid.UUID, label string) (uuid.UUID, error)

	// SaveMessage appends a message to an existing session.
	SaveMessage(ctx context.Context, sessionID, tenantID uuid.UUID, role, content string) error

	// GetHistory returns the last `limit` messages for a session,
	// in chronological order, scoped to tenantID.
	GetHistory(ctx context.Context, tenantID, sessionID uuid.UUID, limit int) ([]LLMMessage, error)
}

// ----------------------------------------------------------------
// Technology ports
// ----------------------------------------------------------------

// Embedder converts text into dense float32 vectors.
type Embedder interface {
	// EmbedDocuments embeds a batch of chunk strings (document mode).
	EmbedDocuments(ctx context.Context, texts []string) ([][]float32, error)

	// EmbedQuery embeds a single user query (query mode).
	EmbedQuery(ctx context.Context, query string) ([]float32, error)
}

// LLM generates a natural-language answer given context and history.
type LLM interface {
	// Answer produces an answer grounded in contextText.
	// history is the conversation so far (most recent last).
	Answer(
		ctx context.Context,
		question string,
		contextText string,
		history []LLMMessage,
	) (string, error)

	// ExtractFromFile extracts text from images/PDFs using vision capabilities.
	// Used by DocumentParser for image-based documents.
	ExtractFromFile(ctx context.Context, data []byte, mediaType, hint string) (string, error)
}

// Parser extracts text content from binary document files.
type Parser interface {
	// Parse accepts raw bytes and the original filename.
	// Returns a ParsedDocument with per-page text slices.
	Parse(ctx context.Context, filename string, data []byte) (*ParsedDocument, error)
}
