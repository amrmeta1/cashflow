package handlers

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/finch-co/cashflow/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// RAGProxyHandler proxies requests to the RAG service
type RAGProxyHandler struct {
	ragServiceURL string
	httpClient    *http.Client
}

// NewRAGProxyHandler creates a new RAG proxy handler
func NewRAGProxyHandler(ragServiceURL string) *RAGProxyHandler {
	return &RAGProxyHandler{
		ragServiceURL: strings.TrimSuffix(ragServiceURL, "/"),
		httpClient:    &http.Client{},
	}
}

// UploadDocument proxies document upload to RAG service
func (h *RAGProxyHandler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		WriteErrorResponse(w, models.ErrTenantRequired)
		return
	}

	// Parse multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	// Get file from form
	file, header, err := r.FormFile("file")
	if err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}
	defer file.Close()

	// Read file content
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	// Create new multipart form for RAG service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add file
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if _, err := part.Write(fileBytes); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Add form fields
	if title := r.FormValue("title"); title != "" {
		writer.WriteField("title", title)
	}
	if category := r.FormValue("category"); category != "" {
		writer.WriteField("category", category)
	}

	writer.Close()

	// Proxy to RAG service
	url := fmt.Sprintf("%s/api/v1/tenants/%s/rag/documents", h.ragServiceURL, tenantID)
	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := h.httpClient.Do(req)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Copy response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// ListDocuments proxies list documents to RAG service
func (h *RAGProxyHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		WriteErrorResponse(w, models.ErrTenantRequired)
		return
	}

	url := fmt.Sprintf("%s/api/v1/tenants/%s/rag/documents", h.ragServiceURL, tenantID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// DeleteDocument proxies delete document to RAG service
func (h *RAGProxyHandler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		WriteErrorResponse(w, models.ErrTenantRequired)
		return
	}

	docID := chi.URLParam(r, "documentID")
	if _, err := uuid.Parse(docID); err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	url := fmt.Sprintf("%s/api/v1/tenants/%s/rag/documents/%s", h.ragServiceURL, tenantID, docID)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// Query proxies RAG query to RAG service
func (h *RAGProxyHandler) Query(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		WriteErrorResponse(w, models.ErrTenantRequired)
		return
	}

	// Read request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	url := fmt.Sprintf("%s/api/v1/tenants/%s/rag/query", h.ragServiceURL, tenantID)
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
