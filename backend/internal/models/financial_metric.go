package models

import (
	"time"

	"github.com/google/uuid"
)

// FinancialMetric represents a calculated financial metric at a point in time
// Supports time-series tracking of metrics like burn_rate, runway_days, etc.
type FinancialMetric struct {
	ID          uuid.UUID      `json:"id"`
	TenantID    uuid.UUID      `json:"tenant_id"`
	MetricName  string         `json:"metric_name"`
	MetricValue float64        `json:"metric_value"`
	PeriodStart *time.Time     `json:"period_start,omitempty"`
	PeriodEnd   *time.Time     `json:"period_end,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// Common metric names
const (
	MetricBurnRate        = "burn_rate"         // Daily cash burn
	MetricRunwayDays      = "runway_days"       // Cash runway in days
	MetricRevenueGrowth   = "revenue_growth"    // Revenue growth rate
	MetricExpenseRatio    = "expense_ratio"     // Expense to revenue ratio
	MetricLiquidityBuffer = "liquidity_buffer"  // Cash buffer amount
	MetricCollectionScore = "collection_score"  // Collection health score (0-100)
	MetricHealthScore     = "health_score"      // Overall financial health (0-100)
	MetricCashBalance     = "cash_balance"      // Current cash balance
	MetricMonthlyRevenue  = "monthly_revenue"   // Monthly revenue
	MetricMonthlyExpense  = "monthly_expense"   // Monthly expense
)

// CreateMetricInput represents input for creating a financial metric
type CreateMetricInput struct {
	TenantID    uuid.UUID      `json:"tenant_id"`
	MetricName  string         `json:"metric_name"`
	MetricValue float64        `json:"metric_value"`
	PeriodStart *time.Time     `json:"period_start,omitempty"`
	PeriodEnd   *time.Time     `json:"period_end,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// MetricFilter represents filter criteria for querying metrics
type MetricFilter struct {
	TenantID    uuid.UUID
	MetricNames []string
	StartDate   *time.Time
	EndDate     *time.Time
	Limit       int
}
