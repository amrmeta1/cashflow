package domain

import (
	"time"

	"github.com/google/uuid"
)

// DocumentType represents the type of financial document
type DocumentType string

const (
	DocumentTypePolicy    DocumentType = "policy"
	DocumentTypeContract  DocumentType = "contract"
	DocumentTypeReport    DocumentType = "report"
	DocumentTypeStatement DocumentType = "statement"
	DocumentTypeFAQ       DocumentType = "faq"
	DocumentTypeTXT       DocumentType = "txt"
	DocumentTypePDF       DocumentType = "pdf"
	DocumentTypeDOCX      DocumentType = "docx"
	DocumentTypeXLSX      DocumentType = "xlsx"
	DocumentTypeCSV       DocumentType = "csv"
	DocumentTypeImage     DocumentType = "image"
)

// DocumentStatus represents the processing status of a document
type DocumentStatus string

const (
	DocumentStatusProcessing DocumentStatus = "processing"
	DocumentStatusReady      DocumentStatus = "ready"
	DocumentStatusFailed     DocumentStatus = "failed"
)

// Document represents a financial document uploaded for RAG
type Document struct {
	ID         uuid.UUID      `json:"id"`
	TenantID   uuid.UUID      `json:"tenant_id"`
	Title      string         `json:"title"`
	Type       DocumentType   `json:"type"`
	FileName   string         `json:"file_name,omitempty"`
	MimeType   string         `json:"mime_type,omitempty"`
	Source     string         `json:"source,omitempty"`
	UploadedBy uuid.UUID      `json:"uploaded_by,omitempty"`
	Status     DocumentStatus `json:"status"`
	CreatedAt  time.Time      `json:"created_at"`
}

// CreateDocumentInput represents input for creating a document
type CreateDocumentInput struct {
	TenantID   uuid.UUID    `json:"tenant_id"`
	Title      string       `json:"title"`
	Type       DocumentType `json:"type"`
	FileName   string       `json:"file_name,omitempty"`
	MimeType   string       `json:"mime_type,omitempty"`
	Source     string       `json:"source,omitempty"`
	UploadedBy uuid.UUID    `json:"uploaded_by,omitempty"`
}

// UpdateDocumentInput represents input for updating a document
type UpdateDocumentInput struct {
	Title  *string         `json:"title,omitempty"`
	Status *DocumentStatus `json:"status,omitempty"`
}

// IsValidDocumentType checks if a document type is recognized
// Supports both file extensions (pdf, docx, txt) and semantic types (policy, contract, etc.)
func IsValidDocumentType(docType DocumentType) bool {
	switch docType {
	case DocumentTypePolicy, DocumentTypeContract, DocumentTypeReport,
		DocumentTypeStatement, DocumentTypeFAQ,
		DocumentTypeTXT, DocumentTypePDF, DocumentTypeDOCX,
		DocumentTypeXLSX, DocumentTypeCSV, DocumentTypeImage:
		return true
	default:
		// Allow any type - validation is informational only
		return true
	}
}

// NormalizeDocumentType converts common file extensions to standard types
func NormalizeDocumentType(input string) DocumentType {
	switch input {
	case "pdf", "PDF", ".pdf":
		return DocumentTypePDF
	case "docx", "DOCX", ".docx":
		return DocumentTypeDOCX
	case "xlsx", "XLSX", ".xlsx", "xls", "XLS", ".xls":
		return DocumentTypeXLSX
	case "csv", "CSV", ".csv":
		return DocumentTypeCSV
	case "txt", "TXT", ".txt", "text":
		return DocumentTypeTXT
	case "image", "jpg", "jpeg", "png", "gif", "webp", ".jpg", ".jpeg", ".png", ".gif", ".webp":
		return DocumentTypeImage
	default:
		return DocumentType(input)
	}
}
