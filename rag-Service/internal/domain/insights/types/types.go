package types

import "time"

// TransactionType represents credit or debit
type TransactionType string

const (
	Credit TransactionType = "credit"
	Debit  TransactionType = "debit"
)

// BankTransaction represents a single transaction
type BankTransaction struct {
	ID           string
	Date         time.Time
	Description  string
	Amount       float64
	Type         TransactionType
	BalanceAfter float64
}

// AlertSeverity levels
type AlertSeverity string

const (
	SeverityInfo     AlertSeverity = "info"
	SeverityMedium   AlertSeverity = "medium"
	SeverityHigh     AlertSeverity = "high"
	SeverityCritical AlertSeverity = "critical"
)

// Risk IDs
const (
	RiskBurnSpike        = "burn_spike"
	RiskBurnTrend        = "burn_trend"
	RiskLiquidityRunway  = "liquidity_runway"
	RiskNegativeForecast = "negative_forecast"
	RiskRevenueDrop      = "revenue_drop"
	RiskRevenueMiss      = "revenue_miss"
)

// Opportunity IDs
const (
	OpportunityOverdueReceivables = "overdue_receivables"
	OpportunityVendorBatching     = "vendor_batching"
	OpportunityVendorRescheduling = "vendor_rescheduling"
)

// Risk represents a financial risk
type Risk struct {
	ID              string
	Severity        AlertSeverity
	Title           string
	Message         string
	PotentialImpact float64
	Metadata        map[string]interface{}
	Data            map[string]interface{} // Additional structured data
}

// Opportunity represents an optimization opportunity
type Opportunity struct {
	ID             string
	Title          string
	Message        string
	PotentialValue float64
	Metadata       map[string]interface{}
	Data           map[string]interface{} // Additional structured data
}

// ForecastEntry for liquidity forecasting
type ForecastEntry struct {
	WeekNumber              int
	WeekStart               time.Time
	WeekStartDate           time.Time // Alias for compatibility
	ForecastedEndingBalance float64
	ForecastedOutflow       float64
	ForecastedInflow        float64
}
