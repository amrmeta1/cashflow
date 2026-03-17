package operations

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/models"
)

// IngestionHandler handles HTTP requests for the operations service.
type IngestionHandler struct {
	uc *UseCase
}

// NewIngestionHandler creates a new operations handler.
func NewIngestionHandler(uc *UseCase) *IngestionHandler {
	return &IngestionHandler{uc: uc}
}

// ImportBankCSV handles POST /tenants/{tenantId}/imports/bank-csv
func (h *IngestionHandler) ImportBankCSV(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	// Parse multipart form (max 32MB)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "invalid multipart form", http.StatusBadRequest)
		return
	}

	// Get account_id from form field
	accountIDStr := r.FormValue("account_id")
	if accountIDStr == "" {
		http.Error(w, "account_id is required", http.StatusBadRequest)
		return
	}
	accountID, err := uuid.Parse(accountIDStr)
	if err != nil {
		http.Error(w, "invalid account_id", http.StatusBadRequest)
		return
	}

	// Get uploaded file
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	result, err := h.uc.ImportBankCSV(r.Context(), tenantID, accountID, file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Auto-trigger analysis after successful CSV import (disabled - publisher not implemented)
	// TODO: Re-enable when publisher is implemented

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// ImportBankJSON handles POST /tenants/{tenantId}/imports/bank-json
func (h *IngestionHandler) ImportBankJSON(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	var payload models.ImportBankJSONPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if payload.AccountID == uuid.Nil {
		http.Error(w, "account_id is required", http.StatusBadRequest)
		return
	}

	if len(payload.Transactions) == 0 {
		http.Error(w, "transactions array cannot be empty", http.StatusBadRequest)
		return
	}

	result, err := h.uc.ImportBankJSON(r.Context(), tenantID, payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// ListTransactions handles GET /tenants/{tenantId}/transactions
func (h *IngestionHandler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	filter := models.TransactionFilter{
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"data":   txns,
		"total":  total,
		"limit":  filter.Limit,
		"offset": filter.Offset,
	}
	json.NewEncoder(w).Encode(response)
}

// CreateBankAccount handles POST /tenants/{tenantId}/bank-accounts
func (h *IngestionHandler) CreateBankAccount(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	var input models.CreateBankAccountInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	account, err := h.uc.CreateBankAccount(r.Context(), tenantID, input)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(account)
}

// SyncBank handles POST /tenants/{tenantId}/sync/bank
func (h *IngestionHandler) SyncBank(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	job, err := h.uc.EnqueueSyncBank(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(job)
}

// SyncAccounting handles POST /tenants/{tenantId}/sync/accounting
func (h *IngestionHandler) SyncAccounting(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	job, err := h.uc.EnqueueSyncAccounting(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(job)
}

// GetCashPosition handles GET /tenants/{tenantID}/cash-position?asOf=YYYY-MM-DD
func (h *IngestionHandler) GetCashPosition(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(pos)
}

// ListBankAccounts handles GET /tenants/{tenantID}/bank-accounts
func (h *IngestionHandler) ListBankAccounts(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	accounts, err := h.uc.ListBankAccounts(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(accounts)
}
