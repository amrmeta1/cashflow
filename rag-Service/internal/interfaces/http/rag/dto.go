// Package rag contains the HTTP interface layer for Tadfuq's RAG endpoints.
// DTOs are decoupled from the domain so the API contract can evolve
// independently of the domain model.
package rag

import "github.com/google/uuid"

// ----------------------------------------------------------------
// Upload document
// ----------------------------------------------------------------

// UploadDocumentResponse is returned after successful ingestion.
type UploadDocumentResponse struct {
	DocumentID uuid.UUID `json:"document_id"`
	TenantID   uuid.UUID `json:"tenant_id"`
	Name       string    `json:"name"`
	FileType   string    `json:"file_type"`
	Category   string    `json:"category"`
	PageCount  int       `json:"page_count"`
	Status     string    `json:"status"`
	CreatedAt  string    `json:"created_at"`
}

// ----------------------------------------------------------------
// List documents
// ----------------------------------------------------------------

// DocumentSummary is one row in a list response.
type DocumentSummary struct {
	DocumentID uuid.UUID `json:"document_id"`
	Name       string    `json:"name"`
	FileType   string    `json:"file_type"`
	Category   string    `json:"category"`
	PageCount  int       `json:"page_count"`
	Status     string    `json:"status"`
	CreatedAt  string    `json:"created_at"`
}

type ListDocumentsResponse struct {
	TenantID  uuid.UUID         `json:"tenant_id"`
	Documents []DocumentSummary `json:"documents"`
	Count     int               `json:"count"`
}

// ----------------------------------------------------------------
// RAG query
// ----------------------------------------------------------------

// QueryRequest is the JSON body for POST …/rag/query
type QueryRequest struct {
	// Question is required.
	Question string `json:"question" binding:"required,min=3"`

	// SessionID is optional. Omit to start a new conversation.
	SessionID *uuid.UUID `json:"session_id,omitempty"`
}

// CitationDTO maps to a single retrieved source chunk.
type CitationDTO struct {
	DocumentID   uuid.UUID `json:"document_id"`
	DocumentName string    `json:"document_name"`
	PageNumber   int       `json:"page_number"`
	ChunkIndex   int       `json:"chunk_index"`
	Excerpt      string    `json:"excerpt"`
	Similarity   float64   `json:"similarity"`
}

// QueryResponse is the full answer payload returned to the caller.
type QueryResponse struct {
	TenantID  uuid.UUID    `json:"tenant_id"`
	SessionID uuid.UUID    `json:"session_id"`
	Question  string       `json:"question"`
	Answer    string       `json:"answer"`
	Citations []CitationDTO `json:"citations"`
}

// ----------------------------------------------------------------
// Error wrapper (consistent error envelope)
// ----------------------------------------------------------------

// ErrorResponse is the standard error body.
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
