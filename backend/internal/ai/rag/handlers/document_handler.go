package http

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/models"
	ragDomain "github.com/finch-co/cashflow/internal/ai/rag/domain"
	"github.com/finch-co/cashflow/internal/ai/rag/usecase"
)

// DocumentHandler handles HTTP requests for document management
type DocumentHandler struct {
	documentRepo     ragDomain.DocumentRepository
	ingestUseCase    *usecase.IngestDocumentUseCase
	chunkUseCase     *usecase.ChunkDocumentUseCase
	embeddingUseCase *usecase.EmbedChunksUseCase
}

// NewDocumentHandler creates a new document handler
func NewDocumentHandler(
	documentRepo ragDomain.DocumentRepository,
	ingestUseCase *usecase.IngestDocumentUseCase,
	chunkUseCase *usecase.ChunkDocumentUseCase,
	embeddingUseCase *usecase.EmbedChunksUseCase,
) *DocumentHandler {
	return &DocumentHandler{
		documentRepo:     documentRepo,
		ingestUseCase:    ingestUseCase,
		chunkUseCase:     chunkUseCase,
		embeddingUseCase: embeddingUseCase,
	}
}

// RegisterRoutes registers document routes
func (h *DocumentHandler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.UploadDocument)
	r.Get("/", h.ListDocuments)
	r.Get("/{documentID}", h.GetDocument)
	r.Delete("/{documentID}", h.DeleteDocument)
}

// UploadDocument handles document upload
func (h *DocumentHandler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	// Get tenant ID from context
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, http.StatusBadRequest, "tenant_id required")
		return
	}

	// Get user ID from context (demo mode)
	userID, _ := models.UserIDFromContext(r.Context())

	// Parse multipart form (max 25MB)
	if err := r.ParseMultipartForm(25 << 20); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "invalid multipart form")
		return
	}

	// Get form fields
	title := r.FormValue("title")
	if title == "" {
		writeErrorResponse(w, http.StatusBadRequest, "title is required")
		return
	}

	docType := r.FormValue("type")
	if docType == "" {
		writeErrorResponse(w, http.StatusBadRequest, "type is required")
		return
	}

	// Get uploaded file
	file, header, err := r.FormFile("file")
	if err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	// Validate file size (25MB)
	if header.Size > 25<<20 {
		writeErrorResponse(w, http.StatusRequestEntityTooLarge, "file size exceeds 25MB limit")
		return
	}

	// Read file data
	fileData, err := io.ReadAll(file)
	if err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "failed to read file")
		return
	}

	// Detect MIME type from header
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = http.DetectContentType(fileData)
	}

	// Call ingest use case
	input := usecase.IngestDocumentInput{
		TenantID:   tenantID,
		Title:      title,
		Type:       ragDomain.DocumentType(docType),
		FileData:   fileData,
		FileName:   header.Filename,
		MimeType:   mimeType,
		UploadedBy: userID,
	}

	doc, err := h.ingestUseCase.Execute(r.Context(), input)
	if err != nil {
		log.Error().Err(err).Msg("Failed to ingest document")
		writeErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Return response
	response := map[string]interface{}{
		"id":         doc.ID,
		"tenant_id":  doc.TenantID,
		"title":      doc.Title,
		"type":       doc.Type,
		"file_name":  doc.FileName,
		"mime_type":  doc.MimeType,
		"status":     doc.Status,
		"created_at": doc.CreatedAt,
		"message":    "Document uploaded successfully. Processing in background.",
	}

	writeJSON(w, http.StatusAccepted, response)
}

// ListDocuments handles listing documents
func (h *DocumentHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, http.StatusBadRequest, "tenant_id required")
		return
	}

	// Parse pagination params
	limit := 50
	offset := 0

	if v := r.URL.Query().Get("limit"); v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 {
			limit = l
		}
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if o, err := strconv.Atoi(v); err == nil && o >= 0 {
			offset = o
		}
	}

	docs, total, err := h.documentRepo.ListByTenant(r.Context(), tenantID, limit, offset)
	if err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "failed to list documents")
		return
	}

	response := map[string]interface{}{
		"data":   docs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}

	writeJSON(w, http.StatusOK, response)
}

// GetDocument handles getting a single document
func (h *DocumentHandler) GetDocument(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, http.StatusBadRequest, "tenant_id required")
		return
	}

	documentID, err := uuid.Parse(chi.URLParam(r, "documentID"))
	if err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "invalid document ID")
		return
	}

	doc, err := h.documentRepo.GetByID(r.Context(), tenantID, documentID)
	if err != nil {
		writeErrorResponse(w, http.StatusNotFound, "document not found")
		return
	}

	writeJSON(w, http.StatusOK, doc)
}

// DeleteDocument handles document deletion
func (h *DocumentHandler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, http.StatusBadRequest, "tenant_id required")
		return
	}

	documentID, err := uuid.Parse(chi.URLParam(r, "documentID"))
	if err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "invalid document ID")
		return
	}

	if err := h.documentRepo.Delete(r.Context(), tenantID, documentID); err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "failed to delete document")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Helper functions

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeErrorResponse(w http.ResponseWriter, status int, message string) {
	response := map[string]string{"error": message}
	writeJSON(w, status, response)
}
