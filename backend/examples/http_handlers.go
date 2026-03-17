package examples

// This file shows example HTTP handlers using the new ingestion service

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ingestion/service"
)

// ImportCSVHandler handles CSV file uploads using the new ingestion service
type ImportCSVHandler struct {
	ingestionService *service.IngestionService
}

// NewImportCSVHandler creates a new CSV import handler
func NewImportCSVHandler(svc *service.IngestionService) *ImportCSVHandler {
	return &ImportCSVHandler{
		ingestionService: svc,
	}
}

// ServeHTTP handles the HTTP request
func (h *ImportCSVHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Parse multipart form (50MB max)
	if err := r.ParseMultipartForm(50 << 20); err != nil {
		log.Error().Err(err).Msg("failed to parse form")
		http.Error(w, "failed to parse form", http.StatusBadRequest)
		return
	}

	// 2. Get file from form
	file, header, err := r.FormFile("file")
	if err != nil {
		log.Error().Err(err).Msg("failed to get file")
		http.Error(w, "failed to get file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 3. Extract tenant ID from path or auth context
	tenantIDStr := r.PathValue("tenantID")
	if tenantIDStr == "" {
		// Fallback: get from query param or auth context
		tenantIDStr = r.URL.Query().Get("tenant_id")
	}

	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		log.Error().Err(err).Str("tenant_id", tenantIDStr).Msg("invalid tenant ID")
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	// 4. Get account ID from form or use default
	accountIDStr := r.FormValue("account_id")
	var accountID uuid.UUID
	
	if accountIDStr != "" {
		accountID, err = uuid.Parse(accountIDStr)
		if err != nil {
			log.Error().Err(err).Str("account_id", accountIDStr).Msg("invalid account ID")
			http.Error(w, "invalid account ID", http.StatusBadRequest)
			return
		}
	} else {
		// Use default account or create one
		// accountID = getOrCreateDefaultAccount(tenantID)
		accountID = uuid.New() // Placeholder
	}

	// 5. Call ingestion service
	log.Info().
		Str("tenant_id", tenantID.String()).
		Str("account_id", accountID.String()).
		Str("file_name", header.Filename).
		Int64("file_size", header.Size).
		Msg("processing CSV import")

	result, err := h.ingestionService.ImportCSV(
		r.Context(),
		tenantID,
		accountID,
		file,
		header.Filename,
	)

	if err != nil {
		log.Error().
			Err(err).
			Str("tenant_id", tenantID.String()).
			Msg("CSV import failed")
		
		http.Error(w, fmt.Sprintf("import failed: %v", err), http.StatusInternalServerError)
		return
	}

	// 6. Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	response := map[string]interface{}{
		"job_id":                result.JobID.String(),
		"total_rows":            result.TotalRows,
		"transactions_parsed":   result.TransactionsParsed,
		"transactions_inserted": result.TransactionsInserted,
		"duplicates":            result.Duplicates,
		"document_type":         result.DocumentType,
		"duration_ms":           result.Duration.Milliseconds(),
		"errors":                result.Errors,
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error().Err(err).Msg("failed to encode response")
	}

	log.Info().
		Str("job_id", result.JobID.String()).
		Int("inserted", result.TransactionsInserted).
		Dur("duration", result.Duration).
		Msg("CSV import completed")
}

// ImportPDFHandler handles PDF file uploads
type ImportPDFHandler struct {
	ingestionService *service.IngestionService
}

// NewImportPDFHandler creates a new PDF import handler
func NewImportPDFHandler(svc *service.IngestionService) *ImportPDFHandler {
	return &ImportPDFHandler{
		ingestionService: svc,
	}
}

// ServeHTTP handles the HTTP request
func (h *ImportPDFHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Similar to CSV handler but calls ImportPDF
	if err := r.ParseMultipartForm(50 << 20); err != nil {
		http.Error(w, "failed to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "failed to get file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	tenantIDStr := r.PathValue("tenantID")
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	accountIDStr := r.FormValue("account_id")
	accountID, err := uuid.Parse(accountIDStr)
	if err != nil {
		http.Error(w, "invalid account ID", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Str("file_name", header.Filename).
		Msg("processing PDF import")

	result, err := h.ingestionService.ImportPDF(
		r.Context(),
		tenantID,
		accountID,
		file,
		header.Filename,
	)

	if err != nil {
		log.Error().Err(err).Msg("PDF import failed")
		http.Error(w, fmt.Sprintf("import failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"job_id":                result.JobID.String(),
		"transactions_inserted": result.TransactionsInserted,
		"duration_ms":           result.Duration.Milliseconds(),
	})
}

// RegisterHandlers registers all ingestion handlers
func RegisterHandlers(mux *http.ServeMux, ingestionService *service.IngestionService) {
	csvHandler := NewImportCSVHandler(ingestionService)
	pdfHandler := NewImportPDFHandler(ingestionService)

	// Register routes
	mux.Handle("/api/v1/tenants/{tenantID}/imports/csv", csvHandler)
	mux.Handle("/api/v1/tenants/{tenantID}/imports/pdf", pdfHandler)

	log.Info().Msg("ingestion handlers registered")
}

// ErrorResponse is a standard error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

// SuccessResponse is a standard success response
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Message string      `json:"message,omitempty"`
}

// WriteError writes an error response
func WriteError(w http.ResponseWriter, statusCode int, err error, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	json.NewEncoder(w).Encode(ErrorResponse{
		Error:   err.Error(),
		Message: message,
	})
}

// WriteSuccess writes a success response
func WriteSuccess(w http.ResponseWriter, data interface{}, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	json.NewEncoder(w).Encode(SuccessResponse{
		Success: true,
		Data:    data,
		Message: message,
	})
}
