// Package insights contains the purely deterministic Insights Engine for Tadfuq.
//
// STRICT RULES:
//   - No LLM calls anywhere in this package.
//   - No imports from the RAG subsystem.
//   - All logic is stateless, testable pure functions.
//   - Forecast data stays here; it must never be passed to RAG.
package insights

import (
	"time"

	"github.com/google/uuid"
)

// ----------------------------------------------------------------
// Input data types  (what the engine reads)
// ----------------------------------------------------------------

// TransactionType distinguishes cash inflows from outflows.
type TransactionType string

const (
	Credit TransactionType = "CREDIT" // inflow
	Debit  TransactionType = "DEBIT"  // outflow
)

// BankTransaction is one actual cash movement.
type BankTransaction struct {
	ID           uuid.UUID
	TenantID     uuid.UUID
	Date         time.Time
	Amount       float64         // always positive
	Type         TransactionType // CREDIT = inflow, DEBIT = outflow
	Description  string
	Category     string
	BalanceAfter float64
	Reference    string
}

// ForecastEntry is one week in the 13-week cash-flow forecast.
// Produced by the deterministic forecasting engine — not by LLM.
type ForecastEntry struct {
	ID                     uuid.UUID
	TenantID               uuid.UUID
	ForecastRunID          uuid.UUID
	WeekNumber             int // 1..13
	WeekStartDate          time.Time
	ForecastedInflow       float64
	ForecastedOutflow      float64
	ForecastedNet          float64 // inflow - outflow
	ForecastedEndingBalance float64
}

// Alert is an existing system-generated alert for the tenant.
type Alert struct {
	ID          uuid.UUID
	TenantID    uuid.UUID
	AlertType   string
	Severity    AlertSeverity
	Title       string
	Message     string
	Details     map[string]any
	TriggeredAt time.Time
	ResolvedAt  *time.Time
	IsActive    bool
}

// EngineInput bundles everything the engine needs.
type EngineInput struct {
	TenantID     uuid.UUID
	Transactions []BankTransaction // all fetched transactions, sorted by date desc
	Forecast     []ForecastEntry   // 13 entries, sorted by week_number asc
	ActiveAlerts []Alert
	AsOf         time.Time // snapshot time (usually now)
}

// ----------------------------------------------------------------
// Output types  (what the engine produces)
// ----------------------------------------------------------------

// AlertSeverity is shared between input alerts and output risks.
type AlertSeverity string

const (
	SeverityCritical AlertSeverity = "CRITICAL"
	SeverityHigh     AlertSeverity = "HIGH"
	SeverityMedium   AlertSeverity = "MEDIUM"
	SeverityLow      AlertSeverity = "LOW"
	SeverityInfo     AlertSeverity = "INFO"
)

// RiskID identifies which deterministic rule fired.
type RiskID string

const (
	RiskLiquidityRunway RiskID = "LIQUIDITY_RUNWAY"
	RiskNegativeForecast RiskID = "NEGATIVE_FORECAST_WEEK"
	RiskBurnSpike       RiskID = "BURN_SPIKE"
	RiskBurnTrend       RiskID = "BURN_TREND_UP"
	RiskRevenueDrop     RiskID = "REVENUE_DROP"
	RiskRevenueMiss     RiskID = "REVENUE_FORECAST_MISS"
)

// OpportunityID identifies which rule produced the opportunity.
type OpportunityID string

const (
	OpportunityOverdueReceivables  OpportunityID = "OVERDUE_RECEIVABLES"
	OpportunityVendorBatching      OpportunityID = "VENDOR_BATCHING"
	OpportunityVendorRescheduling  OpportunityID = "VENDOR_RESCHEDULING"
)

// Risk is a detected financial threat.
type Risk struct {
	ID       RiskID        `json:"id"`
	Severity AlertSeverity `json:"severity"`
	Title    string        `json:"title"`
	Message  string        `json:"message"`
	Data     map[string]any `json:"data"`
}

// Opportunity is a detected improvement potential.
type Opportunity struct {
	ID             OpportunityID  `json:"id"`
	Title          string         `json:"title"`
	Message        string         `json:"message"`
	PotentialValue float64        `json:"potential_value"` // in tenant currency
	Data           map[string]any `json:"data"`
}

// Recommendation is an actionable step derived from risks + opportunities.
type Recommendation struct {
	Priority   int            `json:"priority"`   // 1 = most urgent
	Action     string         `json:"action"`
	Rationale  string         `json:"rationale"`
	LinkedRisk RiskID         `json:"linked_risk,omitempty"`
	Data       map[string]any `json:"data"`
}

// DateRange reports the span of data used.
type DateRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

// InsightResult is the final output of one engine run.
type InsightResult struct {
	TenantID        uuid.UUID        `json:"tenant_id"`
	GeneratedAt     time.Time        `json:"generated_at"`
	DataRange       DateRange        `json:"data_range"`
	Risks           []Risk           `json:"risks"`
	Opportunities   []Opportunity    `json:"opportunities"`
	Recommendations []Recommendation `json:"recommendations"`
}
