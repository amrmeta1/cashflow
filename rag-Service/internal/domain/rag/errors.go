package rag

import "errors"

// Sentinel errors for the RAG domain.
// Use errors.Is() to check for these in upper layers.

var (
	// ErrTenantNotFound is returned when the tenant UUID does not exist.
	ErrTenantNotFound = errors.New("rag: tenant not found")

	// ErrDocumentNotFound is returned when a document does not belong to the tenant
	// or simply does not exist.
	ErrDocumentNotFound = errors.New("rag: document not found")

	// ErrForbiddenCategory is returned when a caller tries to upload a document
	// whose category is outside the allowed RAG scope (e.g. "forecast").
	// RULE: RAG handles policy | contract | report | regulation | explanation ONLY.
	ErrForbiddenCategory = errors.New("rag: document category is not allowed in RAG; use the forecasting engine for model/forecast data")

	// ErrUnsupportedFileType is returned for file extensions RAG cannot parse.
	ErrUnsupportedFileType = errors.New("rag: unsupported file type")

	// ErrEmptyDocument is returned when a parsed document yields no extractable text.
	ErrEmptyDocument = errors.New("rag: document produced no text content after parsing")

	// ErrNoDocumentsIngested is returned when a tenant queries but has no data yet.
	ErrNoDocumentsIngested = errors.New("rag: no documents have been ingested for this tenant")
)
