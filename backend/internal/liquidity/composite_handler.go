package liquidity

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/go-chi/chi/v5"
)

// CompositeHandler combines all liquidity module handlers
type CompositeHandler struct {
	forecast  *ForecastHandler
	cashStory *CashStoryUseCase
	decision  *DecisionEngine
}

// NewCompositeHandler creates a new composite handler
func NewCompositeHandler(
	forecast *ForecastHandler,
	cashStory *CashStoryUseCase,
	decision *DecisionEngine,
) *CompositeHandler {
	return &CompositeHandler{
		forecast:  forecast,
		cashStory: cashStory,
		decision:  decision,
	}
}

// GetCurrentForecast delegates to forecast handler
func (h *CompositeHandler) GetCurrentForecast(w http.ResponseWriter, r *http.Request) {
	h.forecast.GetCurrentForecast(w, r)
}

// GetCashStory generates AI-powered cash story
func (h *CompositeHandler) GetCashStory(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	story, err := h.cashStory.GenerateCashStory(r.Context(), tenantID)
	if err != nil {
		http.Error(w, "failed to generate cash story", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(story)
}

// GetRecommendedActions generates recommended treasury actions
func (h *CompositeHandler) GetRecommendedActions(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		http.Error(w, "invalid tenant ID", http.StatusBadRequest)
		return
	}

	actions, err := h.decision.RecommendActions(r.Context(), tenantID)
	if err != nil {
		http.Error(w, "failed to generate recommendations", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(actions)
}
