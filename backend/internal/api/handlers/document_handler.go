package handlers

import (
	"io"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	ragDomain "github.com/finch-co/cashflow/internal/ai/rag/domain"
	"github.com/finch-co/cashflow/internal/ai/rag/usecase"
	"github.com/finch-co/cashflow/internal/models"
)

// DocumentHandler wraps RAG document functionality for the AI Advisor
type DocumentHandler struct {
	documentRepo  ragDomain.DocumentRepository
	ingestUseCase *usecase.IngestDocumentUseCase
}

// NewDocumentHandler creates a new document handler
func NewDocumentHandler(
	documentRepo ragDomain.DocumentRepository,
	ingestUseCase *usecase.IngestDocumentUseCase,
) *DocumentHandler {
	return &DocumentHandler{
		documentRepo:  documentRepo,
		ingestUseCase: ingestUseCase,
	}
}

// UploadDocument handles POST /tenants/{tenantID}/documents
func (h *DocumentHandler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		WriteErrorResponse(w, models.ErrTenantRequired)
		return
	}

	userID, _ := models.UserIDFromContext(r.Context())

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	title := r.FormValue("title")
	if title == "" {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	docType := r.FormValue("type")
	if docType == "" {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	// Validate document type (pdf, docx, xlsx, csv, txt, image)
	normalizedType := ragDomain.NormalizeDocumentType(docType)
	if normalizedType != ragDomain.DocumentTypePDF &&
		normalizedType != ragDomain.DocumentTypeDOCX &&
		normalizedType != ragDomain.DocumentTypeXLSX &&
		normalizedType != ragDomain.DocumentTypeCSV &&
		normalizedType != ragDomain.DocumentTypeTXT &&
		normalizedType != ragDomain.DocumentTypeImage {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}
	defer file.Close()

	// Enforce 10MB limit
	if header.Size > 10<<20 {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	fileData, err := io.ReadAll(file)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	input := usecase.IngestDocumentInput{
		TenantID:   tenantID,
		Title:      title,
		Type:       normalizedType,
		FileName:   header.Filename,
		MimeType:   header.Header.Get("Content-Type"),
		FileData:   fileData,
		UploadedBy: userID,
	}

	doc, err := h.ingestUseCase.Execute(r.Context(), input)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, doc)
}

// ListDocuments handles GET /tenants/{tenantID}/documents
func (h *DocumentHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		WriteErrorResponse(w, models.ErrTenantRequired)
		return
	}

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
		WriteErrorResponse(w, err)
		return
	}

	WriteJSONList(w, http.StatusOK, docs, total, limit, offset)
}

// DeleteDocument handles DELETE /tenants/{tenantID}/documents/{documentID}
func (h *DocumentHandler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		WriteErrorResponse(w, models.ErrTenantRequired)
		return
	}

	documentIDStr := chi.URLParam(r, "documentID")
	documentID, err := uuid.Parse(documentIDStr)
	if err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	// Verify document belongs to tenant (GetByID enforces tenant isolation)
	_, err = h.documentRepo.GetByID(r.Context(), tenantID, documentID)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	if err := h.documentRepo.Delete(r.Context(), tenantID, documentID); err != nil {
		WriteErrorResponse(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
