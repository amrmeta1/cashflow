// Package rag contains the pure domain model for Tadfuq's RAG subsystem.
//
// STRICT RULE: This package must NOT import anything from
// infrastructure, http, or the forecasting engine. It is the
// inner-most layer of the hexagonal architecture.
package rag

import (
	"time"

	"github.com/google/uuid"
)

// ----------------------------------------------------------------
// Value types
// ----------------------------------------------------------------

// DocumentCategory restricts the kinds of documents that may be
// ingested into the RAG system.
//
// FORBIDDEN categories (must be rejected at the service boundary):
//   - "forecast"  — use the deterministic forecasting engine
//   - "model"     — same as above
type DocumentCategory string

const (
	CategoryPolicy      DocumentCategory = "policy"
	CategoryContract    DocumentCategory = "contract"
	CategoryReport      DocumentCategory = "report"
	CategoryRegulation  DocumentCategory = "regulation"
	CategoryExplanation DocumentCategory = "explanation"
)

// AllowedCategories is the exhaustive set of categories accepted by RAG.
var AllowedCategories = map[DocumentCategory]bool{
	CategoryPolicy:      true,
	CategoryContract:    true,
	CategoryReport:      true,
	CategoryRegulation:  true,
	CategoryExplanation: true,
}

// DocumentStatus tracks the ingestion lifecycle.
type DocumentStatus string

const (
	StatusProcessing DocumentStatus = "processing"
	StatusReady      DocumentStatus = "ready"
	StatusFailed     DocumentStatus = "failed"
)

// ----------------------------------------------------------------
// Aggregates / Entities
// ----------------------------------------------------------------

// Tenant is a lightweight identity record.
type Tenant struct {
	ID        uuid.UUID
	Name      string
	IsActive  bool
	CreatedAt time.Time
}

// Document is the aggregate root for an ingested file.
// Every document is owned by exactly one tenant.
type Document struct {
	ID        uuid.UUID
	TenantID  uuid.UUID
	Name      string
	FileType  string
	Category  DocumentCategory
	FileSize  int64
	PageCount int
	Status    DocumentStatus
	Metadata  map[string]any
	CreatedAt time.Time
	UpdatedAt time.Time
}

// Chunk is a sub-section of a Document with its vector embedding.
// tenant_id is denormalised here so every vector search can be
// scoped without an extra JOIN.
type Chunk struct {
	ID         uuid.UUID
	TenantID   uuid.UUID
	DocumentID uuid.UUID
	Content    string
	ChunkIndex int
	PageNumber int
	Embedding  []float32
	Metadata   map[string]any
	CreatedAt  time.Time
}

// ScoredChunk is a Chunk returned by similarity search, annotated
// with the source document name and cosine similarity score.
type ScoredChunk struct {
	Chunk
	DocumentName string
	Similarity   float64 // 0..1  (1 = identical)
}

// Citation is the public-facing representation of a retrieved
// chunk included in a QueryResult.
type Citation struct {
	DocumentID   uuid.UUID `json:"document_id"`
	DocumentName string    `json:"document_name"`
	PageNumber   int       `json:"page_number"`
	ChunkIndex   int       `json:"chunk_index"`
	Excerpt      string    `json:"excerpt"` // first 300 chars of the chunk
	Similarity   float64   `json:"similarity"`
}

// QueryResult is what the RAG service returns to callers.
type QueryResult struct {
	Answer    string
	Citations []Citation
	SessionID uuid.UUID
	TenantID  uuid.UUID
}

// ----------------------------------------------------------------
// Command / Input objects
// ----------------------------------------------------------------

// UploadRequest carries everything needed to ingest one document.
type UploadRequest struct {
	TenantID uuid.UUID
	FileName string
	FileType string           // pdf | docx | jpeg | png | webp
	Category DocumentCategory // must be in AllowedCategories
	FileSize int64
	Data     []byte
}

// QueryRequest carries a single user question.
type QueryRequest struct {
	TenantID  uuid.UUID
	Question  string
	SessionID *uuid.UUID // nil = create a new session
}

// ParsedDocument is what the Parser port returns.
type ParsedDocument struct {
	Pages      []string // one entry per page / section
	PageCount  int
	SourceType string   // "excel", "csv", "pdf", "docx", "image", "txt"
	SheetNames []string // for Excel files, one per page
}

// LLMMessage is a single turn in conversation history passed to the LLM.
type LLMMessage struct {
	Role    string // "user" | "assistant"
	Content string
}
