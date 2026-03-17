package liquidity

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/finch-co/cashflow/internal/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ForecastHandler handles HTTP requests for cash flow forecasting.
type ForecastHandler struct {
	uc *ForecastUseCase
}

// NewForecastHandler creates a new forecast HTTP handler.
func NewForecastHandler(uc *ForecastUseCase) *ForecastHandler {
	return &ForecastHandler{uc: uc}
}

// GetCurrentForecast handles GET /api/v1/tenants/{tenantID}/forecast/current.
// Returns a 13-week cash forecast based on the last 90 days of transaction data.
// Returns an empty forecast (not mock data) if no transactions exist.
func (h *ForecastHandler) GetCurrentForecast(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, fmt.Sprintf("%v: invalid tenant ID", models.ErrValidation), http.StatusBadRequest)
		return
	}

	result, err := h.uc.GenerateForecast(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}
