package models

import (
	"time"

	"github.com/google/uuid"
	pgvector "github.com/pgvector/pgvector-go"
)

// Document represents an ingested financial document
type Document struct {
	ID         uuid.UUID              `json:"id" db:"id"`
	Name       string                 `json:"name" db:"name"`
	FileType   string                 `json:"file_type" db:"file_type"`
	FileSize   int64                  `json:"file_size" db:"file_size"`
	PageCount  int                    `json:"page_count" db:"page_count"`
	CreatedAt  time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time              `json:"updated_at" db:"updated_at"`
	Metadata   map[string]interface{} `json:"metadata" db:"metadata"`
}

// Chunk represents a text chunk with its vector embedding
type Chunk struct {
	ID         uuid.UUID              `json:"id" db:"id"`
	DocumentID uuid.UUID              `json:"document_id" db:"document_id"`
	Content    string                 `json:"content" db:"content"`
	ChunkIndex int                    `json:"chunk_index" db:"chunk_index"`
	PageNumber int                    `json:"page_number" db:"page_number"`
	Embedding  pgvector.Vector        `json:"-" db:"embedding"`
	Metadata   map[string]interface{} `json:"metadata" db:"metadata"`
	CreatedAt  time.Time              `json:"created_at" db:"created_at"`
}

// SimilarChunk is a chunk returned from similarity search
type SimilarChunk struct {
	Chunk
	DocumentName string  `json:"document_name"`
	Similarity   float64 `json:"similarity"`
}

// ChatSession represents a conversation session
type ChatSession struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// ChatMessage represents a single message in a session
type ChatMessage struct {
	ID        uuid.UUID              `json:"id" db:"id"`
	SessionID uuid.UUID              `json:"session_id" db:"session_id"`
	Role      string                 `json:"role" db:"role"`   // user | assistant
	Content   string                 `json:"content" db:"content"`
	Metadata  map[string]interface{} `json:"metadata" db:"metadata"`
	CreatedAt time.Time              `json:"created_at" db:"created_at"`
}

// IngestRequest is used for document ingestion
type IngestRequest struct {
	DocumentID uuid.UUID
	FileName   string
	FileType   string
	FileSize   int64
	Data       []byte
}

// ChatRequest is used for chat queries
type ChatRequest struct {
	SessionID *uuid.UUID `json:"session_id,omitempty"`
	Question  string     `json:"question" binding:"required"`
}

// ChatResponse is returned from chat queries
type ChatResponse struct {
	SessionID uuid.UUID      `json:"session_id"`
	Answer    string         `json:"answer"`
	Sources   []SimilarChunk `json:"sources"`
}

// ExtractionResult holds structured financial data extracted from a document
type ExtractionResult struct {
	DocumentID uuid.UUID              `json:"document_id"`
	DocumentName string               `json:"document_name"`
	Data       map[string]interface{} `json:"data"`
	RawText    string                 `json:"raw_text,omitempty"`
}
