package operations

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/models"
)

// VendorRuleHandler handles HTTP requests for vendor rules
type VendorRuleHandler struct {
	service *VendorLearningService
}

// NewVendorRuleHandler creates a new vendor rule handler
func NewVendorRuleHandler(service *VendorLearningService) *VendorRuleHandler {
	return &VendorRuleHandler{
		service: service,
	}
}

// CreateVendorRule handles POST /tenants/{tenantID}/vendor-rules
func (h *VendorRuleHandler) CreateVendorRule(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	var input models.CreateVendorRuleInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if input.Pattern == "" {
		http.Error(w, "pattern is required", http.StatusBadRequest)
		return
	}
	if input.VendorName == "" {
		http.Error(w, "vendor_name is required", http.StatusBadRequest)
		return
	}
	if input.Category == "" {
		http.Error(w, "category is required", http.StatusBadRequest)
		return
	}

	rule, err := h.service.CreateRuleFromCorrection(r.Context(), tenantID, input.Pattern, input.VendorName, input.Category)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(rule)
}

// ListVendorRules handles GET /tenants/{tenantID}/vendor-rules
func (h *VendorRuleHandler) ListVendorRules(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	// Optional status filter
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "active" // Default to active rules only
	}

	rules, err := h.service.ListRules(r.Context(), tenantID, status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(rules)
}
