package models

import (
	"time"

	"github.com/google/uuid"
)

// ── Forecast Domain Types ───────────────────────────────────────────────────

// ForecastPoint represents a single week in the forecast with baseline and confidence bounds.
type ForecastPoint struct {
	WeekNumber int     `json:"week_number"` // 1-13
	Baseline   float64 `json:"baseline"`
	UpperBound float64 `json:"upper_bound"` // baseline + 1 std dev
	LowerBound float64 `json:"lower_bound"` // baseline - 1 std dev
}

// ForecastMetrics contains the statistical metrics computed from historical transactions.
type ForecastMetrics struct {
	CurrentCash      float64 `json:"current_cash"`
	AvgDailyInflow   float64 `json:"avg_daily_inflow"`
	AvgDailyOutflow  float64 `json:"avg_daily_outflow"`
	StdDev           float64 `json:"std_dev"`
	TrendRate        float64 `json:"trend_rate"`        // daily change rate from linear regression
	TransactionCount int     `json:"transaction_count"` // number of transactions analyzed
}

// ForecastResult is the complete forecast response for a tenant.
type ForecastResult struct {
	TenantID    uuid.UUID       `json:"tenant_id"`
	GeneratedAt time.Time       `json:"generated_at"`
	Metrics     ForecastMetrics `json:"metrics"`
	Forecast    []ForecastPoint `json:"forecast"`   // 13 weeks
	Confidence  float64         `json:"confidence"` // 0.68 (±1 std dev coverage)
}
