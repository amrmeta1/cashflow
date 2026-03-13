package domain

import (
	"time"

	"github.com/google/uuid"
)

// RagQuery represents a RAG query with answer and citations
type RagQuery struct {
	ID         uuid.UUID      `json:"id"`
	TenantID   uuid.UUID      `json:"tenant_id"`
	UserID     uuid.UUID      `json:"user_id,omitempty"`
	Question   string         `json:"question"`
	Answer     string         `json:"answer,omitempty"`
	Citations  map[string]any `json:"citations,omitempty"`
	Provider   string         `json:"provider,omitempty"`    // AI provider (openai, voyage, etc.)
	LatencyMs  int            `json:"latency_ms,omitempty"`  // Query latency in milliseconds
	TokensUsed int            `json:"tokens_used,omitempty"` // Total tokens consumed
	Status     string         `json:"status"`                // pending, completed, failed, timeout
	CreatedAt  time.Time      `json:"created_at"`
}

// CreateQueryInput represents input for creating a RAG query
type CreateQueryInput struct {
	TenantID   uuid.UUID      `json:"tenant_id"`
	UserID     uuid.UUID      `json:"user_id,omitempty"`
	Question   string         `json:"question"`
	Answer     string         `json:"answer,omitempty"`
	Citations  map[string]any `json:"citations,omitempty"`
	Provider   string         `json:"provider,omitempty"`
	LatencyMs  int            `json:"latency_ms,omitempty"`
	TokensUsed int            `json:"tokens_used,omitempty"`
	Status     string         `json:"status,omitempty"`
}

// Citation represents a reference to a source document chunk
type Citation struct {
	DocumentID uuid.UUID `json:"document_id"`
	ChunkID    uuid.UUID `json:"chunk_id"`
	Content    string    `json:"content,omitempty"`
}
