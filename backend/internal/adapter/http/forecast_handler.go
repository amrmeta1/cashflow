package http

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
	"github.com/finch-co/cashflow/internal/usecase"
)

// ForecastHandler handles HTTP requests for cash flow forecasting.
type ForecastHandler struct {
	uc *usecase.ForecastUseCase
}

// NewForecastHandler creates a new forecast HTTP handler.
func NewForecastHandler(uc *usecase.ForecastUseCase) *ForecastHandler {
	return &ForecastHandler{uc: uc}
}

// GetCurrentForecast handles GET /api/v1/tenants/{tenantID}/forecast/current.
// Returns a 13-week cash forecast based on the last 90 days of transaction data.
// Returns an empty forecast (not mock data) if no transactions exist.
func (h *ForecastHandler) GetCurrentForecast(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid tenant ID", domain.ErrValidation))
		return
	}

	result, err := h.uc.GenerateForecast(r.Context(), tenantID)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSON(w, http.StatusOK, result)
}
