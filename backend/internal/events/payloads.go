package events

import "github.com/google/uuid"

// TransactionsImportedPayload is published when transactions are successfully imported.
type TransactionsImportedPayload struct {
	TenantID         string    `json:"tenant_id"`
	AccountID        string    `json:"account_id"`
	TransactionCount int       `json:"transaction_count"`
	JobID            uuid.UUID `json:"job_id"`
	Source           string    `json:"source"` // "csv", "pdf", "api"
	DocumentType     string    `json:"document_type,omitempty"`
}

// TransactionsFailedPayload is published when transaction import fails.
type TransactionsFailedPayload struct {
	TenantID  string    `json:"tenant_id"`
	AccountID string    `json:"account_id"`
	JobID     uuid.UUID `json:"job_id"`
	Error     string    `json:"error"`
	Source    string    `json:"source"`
}

// AnalysisCompletedPayload is published when analysis completes.
type AnalysisCompletedPayload struct {
	TenantID    string  `json:"tenant_id"`
	HealthScore int     `json:"health_score"`
	RunwayDays  int     `json:"runway_days"`
	RiskLevel   string  `json:"risk_level"`
}

// AnalysisFailedPayload is published when analysis fails.
type AnalysisFailedPayload struct {
	TenantID string `json:"tenant_id"`
	Error    string `json:"error"`
	Step     string `json:"step"`
}

// ForecastGeneratedPayload is published when forecast is generated.
type ForecastGeneratedPayload struct {
	TenantID     string `json:"tenant_id"`
	ForecastWeeks int   `json:"forecast_weeks"`
}

// VendorStatsUpdatedPayload is published when vendor stats are updated.
type VendorStatsUpdatedPayload struct {
	TenantID     string `json:"tenant_id"`
	VendorCount  int    `json:"vendor_count"`
	UpdatedCount int    `json:"updated_count"`
}

// PatternsDetectedPayload is published when cashflow patterns are detected.
type PatternsDetectedPayload struct {
	TenantID      string `json:"tenant_id"`
	PatternCount  int    `json:"pattern_count"`
	RecurringCount int   `json:"recurring_count"`
}
