package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/analysis"
	"github.com/finch-co/cashflow/internal/domain"
)

// analysisLatestResponse is the snake_case JSON response for GET /analysis/latest and POST /analysis/run.
type analysisLatestResponse struct {
	TenantID           string                      `json:"tenant_id"`
	AnalyzedAt         time.Time                   `json:"analyzed_at"`
	Summary            analysisSummary             `json:"summary"`
	Liquidity          analysisLiquidity           `json:"liquidity"`
	ExpenseBreakdown   []analysisExpenseItem       `json:"expense_breakdown"`
	RecurringPayments  []analysisRecurringItem      `json:"recurring_payments"`
	CollectionHealth   analysisCollectionHealth    `json:"collection_health"`
	Recommendations    []analysisRecommendationItem `json:"recommendations"`
	TransactionCount   int                         `json:"transaction_count"`
}

type analysisSummary struct {
	HealthScore     int    `json:"health_score"`
	RiskLevel       string `json:"risk_level"`
	RunwayDays      int    `json:"runway_days"`
	TotalProblems   int    `json:"total_problems"`
}

type analysisLiquidity struct {
	CurrentBalance    float64   `json:"current_balance"`
	DailyBurnRate     float64   `json:"daily_burn_rate"`
	RunwayDays        int       `json:"runway_days"`
	RiskLevel         string    `json:"risk_level"`
	ProjectedZeroDate time.Time `json:"projected_zero_date"`
}

type analysisExpenseItem struct {
	Category   string  `json:"category"`
	Amount     float64 `json:"amount"`
	Percentage float64 `json:"percentage"`
	Count      int     `json:"count"`
	IsDominant bool    `json:"is_dominant"`
}

type analysisRecurringItem struct {
	Description   string  `json:"description"`
	Amount        float64 `json:"amount"`
	Frequency     string  `json:"frequency"`
	TotalPerYear  float64 `json:"total_per_year"`
}

type analysisCollectionHealth struct {
	TotalInflow     float64 `json:"total_inflow"`
	InflowCount     int     `json:"inflow_count"`
	AvgDaysBetween  float64 `json:"avg_days_between"`
	LargestGapDays  int     `json:"largest_gap_days"`
	CollectionScore int     `json:"collection_score"`
	IsIrregular     bool    `json:"is_irregular"`
}

type analysisRecommendationItem struct {
	Priority    int    `json:"priority"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Action      string `json:"action"`
	Impact      string `json:"impact"`
}

func mapAnalysisToResponse(a *domain.CashAnalysis) analysisLatestResponse {
	expenseItems := make([]analysisExpenseItem, len(a.ExpenseBreakdown))
	for i, e := range a.ExpenseBreakdown {
		expenseItems[i] = analysisExpenseItem{
			Category:   e.Category,
			Amount:     e.Amount,
			Percentage: e.Percentage,
			Count:      e.Count,
			IsDominant: e.IsDominant,
		}
	}
	recurringItems := make([]analysisRecurringItem, len(a.RecurringPayments))
	for i, r := range a.RecurringPayments {
		recurringItems[i] = analysisRecurringItem{
			Description:  r.Description,
			Amount:       r.Amount,
			Frequency:    r.Frequency,
			TotalPerYear: r.TotalPerYear,
		}
	}
	recItems := make([]analysisRecommendationItem, len(a.Recommendations))
	for i, r := range a.Recommendations {
		recItems[i] = analysisRecommendationItem{
			Priority:    r.Priority,
			Title:       r.Title,
			Description: r.Description,
			Action:      r.Action,
			Impact:      r.Impact,
		}
	}
	return analysisLatestResponse{
		TenantID:         a.TenantID.String(),
		AnalyzedAt:       a.AnalyzedAt,
		Summary: analysisSummary{
			HealthScore:   a.HealthScore,
			RiskLevel:     string(a.RiskLevel),
			RunwayDays:    a.RunwayDays,
			TotalProblems: len(a.Recommendations),
		},
		Liquidity: analysisLiquidity{
			CurrentBalance:    a.Liquidity.CurrentBalance,
			DailyBurnRate:     a.Liquidity.DailyBurnRate,
			RunwayDays:        a.Liquidity.RunwayDays,
			RiskLevel:         string(a.Liquidity.RiskLevel),
			ProjectedZeroDate: a.Liquidity.ProjectedZeroDate,
		},
		ExpenseBreakdown:  expenseItems,
		RecurringPayments: recurringItems,
		CollectionHealth: analysisCollectionHealth{
			TotalInflow:     a.CollectionHealth.TotalInflow,
			InflowCount:     a.CollectionHealth.InflowCount,
			AvgDaysBetween:  a.CollectionHealth.AvgDaysBetween,
			LargestGapDays:  a.CollectionHealth.LargestGapDays,
			CollectionScore: a.CollectionHealth.CollectionScore,
			IsIrregular:     a.CollectionHealth.IsIrregular,
		},
		Recommendations:   recItems,
		TransactionCount: a.TransactionCount,
	}
}

// AnalysisHandler handles HTTP requests for the cash analysis API.
type AnalysisHandler struct {
	uc   *analysis.UseCase
	repo domain.AnalysisRepository
}

// NewAnalysisHandler creates a new analysis HTTP handler.
func NewAnalysisHandler(uc *analysis.UseCase, repo domain.AnalysisRepository) *AnalysisHandler {
	return &AnalysisHandler{uc: uc, repo: repo}
}

// RunAnalysis handles POST /tenants/{tenantID}/analysis/run.
// Runs the analysis use case and returns the saved analysis in the API response shape.
func (h *AnalysisHandler) RunAnalysis(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid tenant ID", domain.ErrValidation))
		return
	}

	analysis, err := h.uc.RunAnalysis(r.Context(), tenantID)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	dto := mapAnalysisToResponse(analysis)
	writeJSON(w, http.StatusOK, dto)
}

// GetLatest handles GET /tenants/{tenantID}/analysis/latest.
// Returns the most recent analysis for the tenant, or 404 with {"error": "no analysis found"} if none.
func (h *AnalysisHandler) GetLatest(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, fmt.Errorf("%w: invalid tenant ID", domain.ErrValidation))
		return
	}

	analysis, err := h.repo.GetLatest(r.Context(), tenantID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "no analysis found"})
			return
		}
		writeErrorResponse(w, err)
		return
	}

	dto := mapAnalysisToResponse(analysis)
	writeJSON(w, http.StatusOK, dto)
}
