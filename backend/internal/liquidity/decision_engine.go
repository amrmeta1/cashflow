package liquidity

import (
"github.com/finch-co/cashflow/internal/models"
	"context"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// DecisionEngine generates recommended treasury actions based on forecast and transaction analysis
type DecisionEngine struct {
	forecastUC *ForecastUseCase
	txnRepo    models.BankTransactionRepository
}

// NewDecisionEngine creates a new decision engine
func NewDecisionEngine(
	forecastUC *ForecastUseCase,
	txnRepo models.BankTransactionRepository,
) *DecisionEngine {
	return &DecisionEngine{
		forecastUC: forecastUC,
		txnRepo:    txnRepo,
	}
}

// RecommendActions generates recommended treasury actions for a tenant
// Returns up to 5 actions sorted by impact × confidence
// Returns empty array on errors (graceful degradation)
func (d *DecisionEngine) RecommendActions(
	ctx context.Context,
	tenantID uuid.UUID,
) ([]models.TreasuryAction, error) {
	// Get forecast data
	forecast, err := d.forecastUC.GenerateForecast(ctx, tenantID)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to generate forecast for decision engine")
		return []models.TreasuryAction{}, nil // graceful fallback
	}

	// If no forecast data, return empty
	if len(forecast.Forecast) == 0 {
		return []models.TreasuryAction{}, nil
	}

	// Get transaction data for last 30 days
	now := time.Now().UTC()
	from30 := now.AddDate(0, 0, -30)
	from90 := now.AddDate(0, 0, -90)

	filter30 := models.TransactionFilter{
		TenantID: tenantID,
		From:     &from30,
		To:       &now,
		Limit:    10000,
	}

	filter90 := models.TransactionFilter{
		TenantID: tenantID,
		From:     &from90,
		To:       &now,
		Limit:    10000,
	}

	txns30, _, err := d.txnRepo.List(ctx, filter30)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to fetch 30-day transactions for decision engine")
		txns30 = []models.BankTransaction{} // continue with empty
	}

	txns90, _, err := d.txnRepo.List(ctx, filter90)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to fetch 90-day transactions for decision engine")
		txns90 = []models.BankTransaction{} // continue with empty
	}

	// Analyze and generate actions
	var actions []models.TreasuryAction

	// Check liquidity risk
	if d.hasLiquidityRisk(forecast) {
		actions = append(actions, d.getLiquidityActions()...)
	}

	// Check revenue weakness
	if d.hasRevenueWeakness(forecast, txns30, txns90) {
		actions = append(actions, d.getRevenueActions()...)
	}

	// Check cost pressure
	if d.hasCostPressure(forecast) {
		actions = append(actions, d.getCostReductionActions()...)
	}

	// Sort by impact × confidence (descending)
	sort.Slice(actions, func(i, j int) bool {
		scoreI := actions[i].Impact * actions[i].Confidence
		scoreJ := actions[j].Impact * actions[j].Confidence
		return scoreI > scoreJ
	})

	// Return top 5
	if len(actions) > 5 {
		actions = actions[:5]
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Int("action_count", len(actions)).
		Msg("Generated recommended actions")

	return actions, nil
}

// hasLiquidityRisk checks if forecast shows negative balance within 8 weeks
// or if current cash is low relative to burn rate
func (d *DecisionEngine) hasLiquidityRisk(forecast *models.ForecastResult) bool {
	// Check if any of the first 8 weeks shows negative balance
	for i := 0; i < len(forecast.Forecast) && i < 8; i++ {
		if forecast.Forecast[i].Baseline < 0 {
			return true
		}
	}

	// Check if current cash is less than 30 days of outflows
	if forecast.Metrics.AvgDailyOutflow > 0 {
		minCash := forecast.Metrics.AvgDailyOutflow * 30
		if forecast.Metrics.CurrentCash < minCash {
			return true
		}
	}

	return false
}

// hasRevenueWeakness checks if inflows are declining
func (d *DecisionEngine) hasRevenueWeakness(
	forecast *models.ForecastResult,
	txns30 []models.BankTransaction,
	txns90 []models.BankTransaction,
) bool {
	// Calculate average daily inflow for last 30 days
	var inflow30 float64
	for _, txn := range txns30 {
		if txn.Amount > 0 {
			inflow30 += txn.Amount
		}
	}
	avgInflow30 := inflow30 / 30.0

	// Calculate average daily inflow for last 90 days
	var inflow90 float64
	for _, txn := range txns90 {
		if txn.Amount > 0 {
			inflow90 += txn.Amount
		}
	}
	avgInflow90 := inflow90 / 90.0

	// Check if recent inflows are significantly lower (< 85% of historical average)
	if avgInflow90 > 0 && avgInflow30 < avgInflow90*0.85 {
		return true
	}

	return false
}

// hasCostPressure checks if outflows exceed inflows significantly
func (d *DecisionEngine) hasCostPressure(forecast *models.ForecastResult) bool {
	// Check if daily outflows exceed inflows by 20% or more
	if forecast.Metrics.AvgDailyInflow > 0 {
		ratio := forecast.Metrics.AvgDailyOutflow / forecast.Metrics.AvgDailyInflow
		if ratio > 1.2 {
			return true
		}
	}

	return false
}

// getLiquidityActions returns liquidity-focused actions
func (d *DecisionEngine) getLiquidityActions() []models.TreasuryAction {
	return []models.TreasuryAction{
		{
			Type:        models.ActionDelayVendorPayments,
			Category:    models.CategoryLiquidity,
			Title:       "Delay vendor payments",
			Description: "Delay selected vendor payments by 5 days to improve near-term liquidity.",
			Impact:      900000,
			Confidence:  0.82,
			Currency:    "SAR",
		},
		{
			Type:        models.ActionMoveLiquidity,
			Category:    models.CategoryLiquidity,
			Title:       "Move liquidity between accounts",
			Description: "Transfer funds from low-activity accounts to optimize cash position.",
			Impact:      400000,
			Confidence:  0.78,
			Currency:    "SAR",
		},
	}
}

// getRevenueActions returns revenue-focused actions
func (d *DecisionEngine) getRevenueActions() []models.TreasuryAction {
	return []models.TreasuryAction{
		{
			Type:        models.ActionAccelerateReceivables,
			Category:    models.CategoryRevenue,
			Title:       "Accelerate receivables collection",
			Description: "Implement early payment incentives to speed up customer payments.",
			Impact:      650000,
			Confidence:  0.76,
			Currency:    "SAR",
		},
	}
}

// getCostReductionActions returns cost reduction actions
func (d *DecisionEngine) getCostReductionActions() []models.TreasuryAction {
	return []models.TreasuryAction{
		{
			Type:        models.ActionReduceMarketingSpend,
			Category:    models.CategoryCostReduction,
			Title:       "Reduce marketing spend",
			Description: "Cut discretionary marketing expenses by 15% for next quarter.",
			Impact:      400000,
			Confidence:  0.71,
			Currency:    "SAR",
		},
		{
			Type:        models.ActionDelayHiring,
			Category:    models.CategoryCostReduction,
			Title:       "Delay non-critical hiring",
			Description: "Postpone hiring for non-essential positions by one quarter.",
			Impact:      250000,
			Confidence:  0.68,
			Currency:    "SAR",
		},
		{
			Type:        models.ActionCutDiscretionarySpend,
			Category:    models.CategoryCostReduction,
			Title:       "Cut discretionary spending",
			Description: "Reduce optional operational expenses and subscriptions.",
			Impact:      150000,
			Confidence:  0.65,
			Currency:    "SAR",
		},
	}
}
