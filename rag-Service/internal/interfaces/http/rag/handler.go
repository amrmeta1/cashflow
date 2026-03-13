package rag

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"tadfuq/rag-service/internal/domain/rag"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler holds a reference to the domain service and exposes
// tenant-scoped HTTP endpoints.
type Handler struct {
	svc rag.Service
}

// NewHandler constructs the HTTP handler.
func NewHandler(svc rag.Service) *Handler {
	return &Handler{svc: svc}
}

// ----------------------------------------------------------------
// POST /api/v1/tenants/:tenantId/rag/documents
// ----------------------------------------------------------------

// UploadDocument ingests a financial document for the given tenant.
//
// Form fields:
//   - file     (multipart, required)  — the document binary
//   - category (string, required)     — policy | contract | report | regulation | explanation
func (h *Handler) UploadDocument(c *gin.Context) {
	tenantID, ok := parseTenantID(c)
	if !ok {
		return
	}

	// Parse multipart file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "MISSING_FILE",
			Message: "multipart field 'file' is required",
		})
		return
	}
	defer file.Close()

	// Validate file type
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{
		".pdf": true, ".docx": true, ".txt": true,
		".xlsx": true, ".xls": true, ".csv": true,
		".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true,
	}
	if !allowed[ext] {
		c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Code:    "UNSUPPORTED_FILE_TYPE",
			Message: fmt.Sprintf("file type %q is not supported; allowed: pdf, docx, txt, xlsx, xls, csv, jpg, jpeg, png, webp, gif", ext),
		})
		return
	}

	// Validate category
	rawCategory := strings.TrimSpace(c.PostForm("category"))
	if rawCategory == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "MISSING_CATEGORY",
			Message: "form field 'category' is required (policy | contract | report | regulation | explanation)",
		})
		return
	}
	category := rag.DocumentCategory(rawCategory)
	if !rag.AllowedCategories[category] {
		c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
			Code:    "FORBIDDEN_CATEGORY",
			Message: fmt.Sprintf("category %q is not allowed in RAG; allowed: policy, contract, report, regulation, explanation", rawCategory),
		})
		return
	}

	// Read file bytes
	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code: "READ_ERROR", Message: "could not read uploaded file",
		})
		return
	}

	fileType := strings.TrimPrefix(ext, ".")
	if fileType == "jpg" {
		fileType = "jpeg"
	}

	req := rag.UploadRequest{
		TenantID: tenantID,
		FileName: header.Filename,
		FileType: fileType,
		Category: category,
		FileSize: header.Size,
		Data:     data,
	}

	doc, err := h.svc.IngestDocument(c.Request.Context(), req)
	if err != nil {
		h.handleDomainError(c, err)
		return
	}

	c.JSON(http.StatusCreated, UploadDocumentResponse{
		DocumentID: doc.ID,
		TenantID:   doc.TenantID,
		Name:       doc.Name,
		FileType:   doc.FileType,
		Category:   string(doc.Category),
		PageCount:  doc.PageCount,
		Status:     string(doc.Status),
		CreatedAt:  doc.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// ----------------------------------------------------------------
// GET /api/v1/tenants/:tenantId/rag/documents
// ----------------------------------------------------------------

// ListDocuments returns all ingested documents for the tenant.
func (h *Handler) ListDocuments(c *gin.Context) {
	tenantID, ok := parseTenantID(c)
	if !ok {
		return
	}

	docs, err := h.svc.ListDocuments(c.Request.Context(), tenantID)
	if err != nil {
		h.handleDomainError(c, err)
		return
	}

	summaries := make([]DocumentSummary, len(docs))
	for i, d := range docs {
		summaries[i] = DocumentSummary{
			DocumentID: d.ID,
			Name:       d.Name,
			FileType:   d.FileType,
			Category:   string(d.Category),
			PageCount:  d.PageCount,
			Status:     string(d.Status),
			CreatedAt:  d.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}

	c.JSON(http.StatusOK, ListDocumentsResponse{
		TenantID:  tenantID,
		Documents: summaries,
		Count:     len(summaries),
	})
}

// ----------------------------------------------------------------
// DELETE /api/v1/tenants/:tenantId/rag/documents/:docId
// ----------------------------------------------------------------

// DeleteDocument removes a document and all its chunks.
func (h *Handler) DeleteDocument(c *gin.Context) {
	tenantID, ok := parseTenantID(c)
	if !ok {
		return
	}
	docID, err := uuid.Parse(c.Param("docId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code: "INVALID_DOC_ID", Message: "docId must be a valid UUID",
		})
		return
	}

	if err := h.svc.DeleteDocument(c.Request.Context(), tenantID, docID); err != nil {
		h.handleDomainError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "document deleted"})
}

// ----------------------------------------------------------------
// POST /api/v1/tenants/:tenantId/rag/query
// ----------------------------------------------------------------

// Query answers a user question using tenant-scoped RAG.
//
// Request body (JSON):
//
//	{ "question": "...", "session_id": "optional-uuid" }
//
// Response includes the answer text plus ranked citations.
func (h *Handler) Query(c *gin.Context) {
	tenantID, ok := parseTenantID(c)
	if !ok {
		return
	}

	var body QueryRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code: "INVALID_REQUEST", Message: err.Error(),
		})
		return
	}

	req := rag.QueryRequest{
		TenantID:  tenantID,
		Question:  body.Question,
		SessionID: body.SessionID,
	}

	result, err := h.svc.Query(c.Request.Context(), req)
	if err != nil {
		h.handleDomainError(c, err)
		return
	}

	// Map domain citations → DTOs
	citations := make([]CitationDTO, len(result.Citations))
	for i, cit := range result.Citations {
		citations[i] = CitationDTO{
			DocumentID:   cit.DocumentID,
			DocumentName: cit.DocumentName,
			PageNumber:   cit.PageNumber,
			ChunkIndex:   cit.ChunkIndex,
			Excerpt:      cit.Excerpt,
			Similarity:   cit.Similarity,
		}
	}

	c.JSON(http.StatusOK, QueryResponse{
		TenantID:  tenantID,
		SessionID: result.SessionID,
		Question:  body.Question,
		Answer:    result.Answer,
		Citations: citations,
	})
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

// parseTenantID extracts and validates :tenantId from the URL path.
func parseTenantID(c *gin.Context) (uuid.UUID, bool) {
	raw := c.Param("tenantId")
	id, err := uuid.Parse(raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_TENANT_ID",
			Message: "tenantId must be a valid UUID v4",
		})
		return uuid.Nil, false
	}
	return id, true
}

// handleDomainError maps domain sentinel errors to HTTP status codes.
func (h *Handler) handleDomainError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, rag.ErrTenantNotFound):
		c.JSON(http.StatusNotFound, ErrorResponse{Code: "TENANT_NOT_FOUND", Message: err.Error()})
	case errors.Is(err, rag.ErrDocumentNotFound):
		c.JSON(http.StatusNotFound, ErrorResponse{Code: "DOCUMENT_NOT_FOUND", Message: err.Error()})
	case errors.Is(err, rag.ErrNoDocumentsIngested):
		c.JSON(http.StatusNotFound, ErrorResponse{Code: "NO_DOCUMENTS", Message: err.Error()})
	default:
		// Log the actual error for debugging
		fmt.Printf("RAG Query Error: %v\n", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Code: "INTERNAL_ERROR", Message: fmt.Sprintf("error: %v", err)})
	}
}
