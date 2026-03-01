package usecase

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
)

// ForecastUseCase handles cash flow forecasting logic.
type ForecastUseCase struct {
	txnRepo     domain.BankTransactionRepository
	accountRepo domain.BankAccountRepository
}

// NewForecastUseCase creates a new forecast use case.
func NewForecastUseCase(
	txnRepo domain.BankTransactionRepository,
	accountRepo domain.BankAccountRepository,
) *ForecastUseCase {
	return &ForecastUseCase{
		txnRepo:     txnRepo,
		accountRepo: accountRepo,
	}
}

// GenerateForecast generates a 13-week cash forecast for the given tenant.
// Returns an empty forecast (not mock data) if no transactions exist.
func (uc *ForecastUseCase) GenerateForecast(ctx context.Context, tenantID uuid.UUID) (*domain.ForecastResult, error) {
	now := time.Now().UTC()
	from := now.AddDate(0, 0, -90) // Last 90 days

	// Fetch transactions for the last 90 days
	filter := domain.TransactionFilter{
		TenantID: tenantID,
		From:     &from,
		To:       &now,
		Limit:    10000, // reasonable upper bound
		Offset:   0,
	}

	txns, _, err := uc.txnRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("fetching transactions: %w", err)
	}

	// Empty state: no transactions
	if len(txns) == 0 {
		return &domain.ForecastResult{
			TenantID:    tenantID,
			GeneratedAt: now,
			Metrics:     domain.ForecastMetrics{},
			Forecast:    []domain.ForecastPoint{},
			Confidence:  0.0,
		}, nil
	}

	// Compute current cash (sum of all transactions up to today)
	currentCash, err := uc.computeCurrentCash(ctx, tenantID, now)
	if err != nil {
		return nil, fmt.Errorf("computing current cash: %w", err)
	}

	// Compute metrics from transactions
	metrics := uc.computeMetrics(txns, currentCash)

	// Generate 13-week forecast
	forecast := uc.generateWeeklyForecast(metrics)

	return &domain.ForecastResult{
		TenantID:    tenantID,
		GeneratedAt: now,
		Metrics:     metrics,
		Forecast:    forecast,
		Confidence:  0.68, // ±1 std dev coverage
	}, nil
}

// computeCurrentCash calculates the current cash position by summing all account balances.
func (uc *ForecastUseCase) computeCurrentCash(ctx context.Context, tenantID uuid.UUID, asOf time.Time) (float64, error) {
	balances, err := uc.txnRepo.SumBalancesByAccountUpTo(ctx, tenantID, asOf)
	if err != nil {
		return 0, fmt.Errorf("summing balances: %w", err)
	}

	var total float64
	for _, balance := range balances {
		total += balance
	}
	return total, nil
}

// computeMetrics calculates statistical metrics from transaction history.
func (uc *ForecastUseCase) computeMetrics(txns []domain.BankTransaction, currentCash float64) domain.ForecastMetrics {
	if len(txns) == 0 {
		return domain.ForecastMetrics{
			CurrentCash:      currentCash,
			TransactionCount: 0,
		}
	}

	// Calculate total inflows and outflows
	var totalInflow, totalOutflow float64
	for _, txn := range txns {
		if txn.Amount > 0 {
			totalInflow += txn.Amount
		} else {
			totalOutflow += txn.Amount
		}
	}

	// Average daily inflow/outflow over 90 days
	avgDailyInflow := totalInflow / 90.0
	avgDailyOutflow := totalOutflow / 90.0

	// Build daily balance series for last 30 days (for volatility and trend)
	dailyBalances := uc.buildDailyBalances(txns, currentCash, 30)

	// Calculate standard deviation
	stdDev := uc.calculateStdDev(dailyBalances)

	// Calculate trend rate (daily change from linear regression)
	trendRate := uc.computeLinearTrend(dailyBalances)

	return domain.ForecastMetrics{
		CurrentCash:      currentCash,
		AvgDailyInflow:   avgDailyInflow,
		AvgDailyOutflow:  avgDailyOutflow,
		StdDev:           stdDev,
		TrendRate:        trendRate,
		TransactionCount: len(txns),
	}
}

// computeLinearTrend calculates the daily change rate using linear regression.
// Uses least squares method: y = a + b*x, returns b (slope = daily change rate).
func (uc *ForecastUseCase) computeLinearTrend(dailyBalances []float64) float64 {
	n := len(dailyBalances)
	if n < 2 {
		return 0
	}

	// Calculate means
	var sumX, sumY float64
	for i, y := range dailyBalances {
		sumX += float64(i)
		sumY += y
	}
	meanX := sumX / float64(n)
	meanY := sumY / float64(n)

	// Calculate slope: b = Σ((x - x̄)(y - ȳ)) / Σ((x - x̄)²)
	var numerator, denominator float64
	for i, y := range dailyBalances {
		x := float64(i)
		numerator += (x - meanX) * (y - meanY)
		denominator += (x - meanX) * (x - meanX)
	}

	if denominator == 0 {
		return 0
	}

	return numerator / denominator
}

// buildDailyBalances constructs a daily balance series for the last N days.
func (uc *ForecastUseCase) buildDailyBalances(txns []domain.BankTransaction, currentCash float64, days int) []float64 {
	if len(txns) == 0 {
		return []float64{}
	}

	// Find the earliest transaction date
	now := time.Now().UTC()
	startDate := now.AddDate(0, 0, -days)

	// Group transactions by date
	dailyChanges := make(map[string]float64)
	for _, txn := range txns {
		if txn.TxnDate.Before(startDate) {
			continue
		}
		dateKey := txn.TxnDate.Format("2006-01-02")
		dailyChanges[dateKey] += txn.Amount
	}

	// Build daily balance series (working backwards from current cash)
	balances := make([]float64, days)
	runningBalance := currentCash

	for i := days - 1; i >= 0; i-- {
		date := now.AddDate(0, 0, -(days - 1 - i))
		dateKey := date.Format("2006-01-02")
		balances[i] = runningBalance
		runningBalance -= dailyChanges[dateKey] // subtract to go backwards
	}

	return balances
}

// calculateStdDev calculates the standard deviation of a series of values.
func (uc *ForecastUseCase) calculateStdDev(values []float64) float64 {
	n := len(values)
	if n < 2 {
		return 0
	}

	// Calculate mean
	var sum float64
	for _, v := range values {
		sum += v
	}
	mean := sum / float64(n)

	// Calculate variance
	var variance float64
	for _, v := range values {
		diff := v - mean
		variance += diff * diff
	}
	variance /= float64(n)

	// Standard deviation is square root of variance
	return math.Sqrt(variance)
}

// generateWeeklyForecast creates 13 weekly forecast points with confidence bounds.
func (uc *ForecastUseCase) generateWeeklyForecast(metrics domain.ForecastMetrics) []domain.ForecastPoint {
	const numWeeks = 13
	forecast := make([]domain.ForecastPoint, numWeeks)

	for week := 1; week <= numWeeks; week++ {
		days := float64(week * 7)

		// Baseline: current cash + net daily flow * days + trend * days
		netDailyFlow := metrics.AvgDailyInflow + metrics.AvgDailyOutflow // outflow is negative
		baseline := metrics.CurrentCash + (netDailyFlow * days) + (metrics.TrendRate * days)

		// Confidence bounds: ±1 standard deviation
		upperBound := baseline + metrics.StdDev
		lowerBound := baseline - metrics.StdDev

		forecast[week-1] = domain.ForecastPoint{
			WeekNumber: week,
			Baseline:   baseline,
			UpperBound: upperBound,
			LowerBound: lowerBound,
		}
	}

	return forecast
}
