package handlers

import (
	"net/http"
	"time"

	"github.com/finch-co/cashflow/internal/models"
)

// AnalysisHandler provides cash flow analysis endpoints
type AnalysisHandler struct {
	txnRepo models.BankTransactionRepository
}

// NewAnalysisHandler creates a new analysis handler
func NewAnalysisHandler(txnRepo models.BankTransactionRepository) *AnalysisHandler {
	return &AnalysisHandler{txnRepo: txnRepo}
}

// CategorySummary represents aggregated data for a category
type CategorySummary struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	Count    int     `json:"count"`
}

// AnalysisSummary is the response for the latest analysis
type AnalysisSummary struct {
	Inflows      float64           `json:"inflows"`
	Outflows     float64           `json:"outflows"`
	Net          float64           `json:"net"`
	TopExpenses  []CategorySummary `json:"top_expenses"`
	TopIncome    []CategorySummary `json:"top_income"`
	PeriodStart  time.Time         `json:"period_start"`
	PeriodEnd    time.Time         `json:"period_end"`
	TxnCount     int               `json:"txn_count"`
}

// GetLatestAnalysis handles GET /tenants/{tenantID}/analysis/latest
func (h *AnalysisHandler) GetLatestAnalysis(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		WriteErrorResponse(w, models.ErrTenantRequired)
		return
	}

	// Calculate last 30 days
	now := time.Now().UTC()
	from := now.AddDate(0, 0, -30)

	filter := models.TransactionFilter{
		TenantID: tenantID,
		From:     &from,
		To:       &now,
		Limit:    10000, // reasonable upper bound
		Offset:   0,
	}

	txns, total, err := h.txnRepo.List(r.Context(), filter)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	// Calculate totals and categorize
	var totalInflows, totalOutflows float64
	expensesByCategory := make(map[string]*CategorySummary)
	incomeByCategory := make(map[string]*CategorySummary)

	for _, txn := range txns {
		if txn.Amount > 0 {
			// Inflow
			totalInflows += txn.Amount
			category := txn.Category
			if category == "" {
				category = "Uncategorized"
			}
			if _, exists := incomeByCategory[category]; !exists {
				incomeByCategory[category] = &CategorySummary{Category: category}
			}
			incomeByCategory[category].Amount += txn.Amount
			incomeByCategory[category].Count++
		} else {
			// Outflow
			totalOutflows += -txn.Amount // Store as positive
			category := txn.Category
			if category == "" {
				category = "Uncategorized"
			}
			if _, exists := expensesByCategory[category]; !exists {
				expensesByCategory[category] = &CategorySummary{Category: category}
			}
			expensesByCategory[category].Amount += -txn.Amount
			expensesByCategory[category].Count++
		}
	}

	// Convert maps to sorted slices (top 5)
	topExpenses := topNCategories(expensesByCategory, 5)
	topIncome := topNCategories(incomeByCategory, 5)

	summary := AnalysisSummary{
		Inflows:      totalInflows,
		Outflows:     totalOutflows,
		Net:          totalInflows - totalOutflows,
		TopExpenses:  topExpenses,
		TopIncome:    topIncome,
		PeriodStart:  from,
		PeriodEnd:    now,
		TxnCount:     total,
	}

	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"data": summary,
	})
}

// topNCategories returns the top N categories by amount
func topNCategories(categories map[string]*CategorySummary, n int) []CategorySummary {
	result := make([]CategorySummary, 0, len(categories))
	for _, cat := range categories {
		result = append(result, *cat)
	}

	// Simple bubble sort for top N (good enough for small datasets)
	for i := 0; i < len(result) && i < n; i++ {
		for j := i + 1; j < len(result); j++ {
			if result[j].Amount > result[i].Amount {
				result[i], result[j] = result[j], result[i]
			}
		}
	}

	if len(result) > n {
		result = result[:n]
	}

	return result
}
