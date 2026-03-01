package http

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/adapter/mq"
	"github.com/finch-co/cashflow/internal/domain"
	"github.com/finch-co/cashflow/internal/ingestion"
)

// IngestionHandler handles HTTP requests for the ingestion service.
type IngestionHandler struct {
	uc        *ingestion.UseCase
	publisher *mq.Publisher
}

// NewIngestionHandler creates a new ingestion handler.
func NewIngestionHandler(uc *ingestion.UseCase, publisher *mq.Publisher) *IngestionHandler {
	return &IngestionHandler{uc: uc, publisher: publisher}
}

// ImportBankCSV handles POST /tenants/{tenantId}/imports/bank-csv
func (h *IngestionHandler) ImportBankCSV(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid tenant ID", domain.ErrValidation))
		return
	}

	// Parse multipart form (max 32MB)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid multipart form", domain.ErrValidation))
		return
	}

	// Get account_id from form field
	accountIDStr := r.FormValue("account_id")
	if accountIDStr == "" {
		writeErrorResponse(w, fmt.Errorf("%w: account_id is required", domain.ErrValidation))
		return
	}
	accountID, err := uuid.Parse(accountIDStr)
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid account_id", domain.ErrValidation))
		return
	}

	// Get uploaded file
	file, _, err := r.FormFile("file")
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: file is required", domain.ErrValidation))
		return
	}
	defer file.Close()

	result, err := h.uc.ImportBankCSV(r.Context(), tenantID, accountID, file)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	// Auto-trigger analysis after successful CSV import
	payload := map[string]interface{}{
		"tenant_id":         tenantID.String(),
		"transaction_count": result.Inserted,
		"triggered_at":      time.Now().UTC(),
	}
	env, envErr := mq.NewEnvelope(mq.EventAnalysisRequested, tenantID.String(), payload)
	if envErr != nil {
		log.Warn().Err(envErr).Str("tenant_id", tenantID.String()).Msg("failed to create analysis envelope")
	} else if pubErr := h.publisher.PublishEvent(r.Context(), mq.RKAnalysisRequested, env); pubErr != nil {
		log.Warn().Err(pubErr).Str("tenant_id", tenantID.String()).Msg("failed to publish analysis.requested")
	}

	writeJSON(w, http.StatusOK, result)
}

// ListTransactions handles GET /tenants/{tenantId}/transactions
func (h *IngestionHandler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid tenant ID", domain.ErrValidation))
		return
	}

	filter := domain.TransactionFilter{
		TenantID: tenantID,
		Limit:    50,
		Offset:   0,
	}

	// Parse query params
	if v := r.URL.Query().Get("limit"); v != "" {
		if limit, err := strconv.Atoi(v); err == nil && limit > 0 {
			filter.Limit = limit
		}
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if offset, err := strconv.Atoi(v); err == nil && offset >= 0 {
			filter.Offset = offset
		}
	}
	if v := r.URL.Query().Get("accountId"); v != "" {
		if aid, err := uuid.Parse(v); err == nil {
			filter.AccountID = &aid
		}
	}
	if v := r.URL.Query().Get("from"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			filter.From = &t
		}
	}
	if v := r.URL.Query().Get("to"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			filter.To = &t
		}
	}

	txns, total, err := h.uc.ListTransactions(r.Context(), filter)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSONList(w, http.StatusOK, txns, total, filter.Limit, filter.Offset)
}

// CreateBankAccount handles POST /tenants/{tenantId}/bank-accounts
func (h *IngestionHandler) CreateBankAccount(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid tenant ID", domain.ErrValidation))
		return
	}

	var input domain.CreateBankAccountInput
	if err := decodeJSON(r, &input); err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid request body", domain.ErrValidation))
		return
	}

	account, err := h.uc.CreateBankAccount(r.Context(), tenantID, input)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, account)
}

// SyncBank handles POST /tenants/{tenantId}/sync/bank
func (h *IngestionHandler) SyncBank(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid tenant ID", domain.ErrValidation))
		return
	}

	job, err := h.uc.EnqueueSyncBank(r.Context(), tenantID)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSON(w, http.StatusAccepted, job)
}

// SyncAccounting handles POST /tenants/{tenantId}/sync/accounting
func (h *IngestionHandler) SyncAccounting(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid tenant ID", domain.ErrValidation))
		return
	}

	job, err := h.uc.EnqueueSyncAccounting(r.Context(), tenantID)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSON(w, http.StatusAccepted, job)
}

// GetCashPosition handles GET /tenants/{tenantID}/cash-position?asOf=YYYY-MM-DD
func (h *IngestionHandler) GetCashPosition(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid tenant ID", domain.ErrValidation))
		return
	}

	asOf := time.Now().UTC().Truncate(24 * time.Hour)
	if v := r.URL.Query().Get("asOf"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			asOf = t.UTC()
		}
	}

	pos, err := h.uc.GetCashPosition(r.Context(), tenantID, asOf)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSON(w, http.StatusOK, pos)
}
