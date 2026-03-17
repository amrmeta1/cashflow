package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/finch-co/cashflow/internal/agent/engine"
	"github.com/finch-co/cashflow/internal/agent/models"
	coremodels "github.com/finch-co/cashflow/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// SignalHandler handles HTTP requests for signal operations
type SignalHandler struct {
	engine *engine.SignalEngine
}

// NewSignalHandler creates a new signal HTTP handler
func NewSignalHandler(engine *engine.SignalEngine) *SignalHandler {
	return &SignalHandler{engine: engine}
}

// RunSignalEngine handles POST /api/v1/tenants/{tenantID}/signals/run
// Triggers signal detection and returns the results
func (h *SignalHandler) RunSignalEngine(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, fmt.Sprintf("%v: invalid tenant ID", coremodels.ErrValidation), http.StatusBadRequest)
		return
	}

	result, err := h.engine.Run(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// GetSignals handles GET /api/v1/tenants/{tenantID}/signals
// Returns stored signals for the tenant
func (h *SignalHandler) GetSignals(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, fmt.Sprintf("%v: invalid tenant ID", coremodels.ErrValidation), http.StatusBadRequest)
		return
	}

	// Optional status filter
	status := r.URL.Query().Get("status")
	if status == "" {
		status = models.StatusActive // Default to active signals
	}

	result, err := h.engine.GetSignals(r.Context(), tenantID, status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}
