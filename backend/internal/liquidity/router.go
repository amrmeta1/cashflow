package liquidity

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

// CashStoryHandler interface for cash story generation
type CashStoryHandler interface {
	GetCashStory(w http.ResponseWriter, r *http.Request)
}

// DecisionHandler interface for AI decision recommendations
type DecisionHandler interface {
	GetRecommendedActions(w http.ResponseWriter, r *http.Request)
}

// RouterDeps holds dependencies for the liquidity module router
type RouterDeps struct {
	Forecast  *ForecastHandler
	CashStory CashStoryHandler
	Decision  DecisionHandler
}

// NewRouter creates a new router for the liquidity module
// Routes are mounted under /api/v1/liquidity
func NewRouter(deps RouterDeps) chi.Router {
	r := chi.NewRouter()

	// Dashboard endpoint (future)
	// r.Get("/dashboard", deps.Dashboard.Get)

	// Cash forecast - 13-week deterministic forecast
	r.Get("/forecast", deps.Forecast.GetCurrentForecast)

	// Cash story - AI-powered narrative
	r.Get("/cash-story", deps.CashStory.GetCashStory)

	// AI recommended treasury actions
	r.Get("/decisions", deps.Decision.GetRecommendedActions)

	return r
}
