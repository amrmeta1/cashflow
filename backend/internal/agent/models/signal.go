package models

import (
	"time"

	"github.com/google/uuid"
)

// Signal represents a detected financial signal
type Signal struct {
	ID          uuid.UUID              `json:"id"`
	TenantID    uuid.UUID              `json:"tenant_id"`
	SignalType  string                 `json:"signal_type"`
	Severity    string                 `json:"severity"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Data        map[string]interface{} `json:"data"`
	Status      string                 `json:"status"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// SignalResult is the response structure for signal queries
type SignalResult struct {
	TenantID    uuid.UUID      `json:"tenant_id"`
	GeneratedAt time.Time      `json:"generated_at,omitempty"`
	Signals     []Signal       `json:"signals"`
	Alerts      []Signal       `json:"alerts"`
	Summary     SignalSummary  `json:"summary"`
}

// SignalSummary provides aggregate statistics
type SignalSummary struct {
	Total    int `json:"total"`
	Critical int `json:"critical"`
	High     int `json:"high"`
	Medium   int `json:"medium"`
	Low      int `json:"low"`
}

// Severity constants
const (
	SeverityLow      = "LOW"
	SeverityMedium   = "MEDIUM"
	SeverityHigh     = "HIGH"
	SeverityCritical = "CRITICAL"
)

// Status constants
const (
	StatusActive    = "active"
	StatusResolved  = "resolved"
	StatusDismissed = "dismissed"
)

// Signal type constants
const (
	SignalTypeRunwayRisk           = "runway_risk"
	SignalTypeBurnSpike            = "burn_spike"
	SignalTypeRevenueDrop          = "revenue_drop"
	SignalTypeVendorConcentration  = "vendor_concentration"
	SignalTypeReceivableDelay      = "receivable_delay"
	SignalTypeLiquidityGap         = "liquidity_gap"
)

// CreateSignalInput is used to create a new signal
type CreateSignalInput struct {
	TenantID    uuid.UUID
	SignalType  string
	Severity    string
	Title       string
	Description string
	Data        map[string]interface{}
}

// BuildSignalResult constructs a SignalResult from a list of signals
func BuildSignalResult(tenantID uuid.UUID, signals []Signal) *SignalResult {
	alerts := []Signal{}
	summary := SignalSummary{}

	for _, s := range signals {
		summary.Total++
		switch s.Severity {
		case SeverityCritical:
			summary.Critical++
			alerts = append(alerts, s)
		case SeverityHigh:
			summary.High++
			alerts = append(alerts, s)
		case SeverityMedium:
			summary.Medium++
		case SeverityLow:
			summary.Low++
		}
	}

	return &SignalResult{
		TenantID: tenantID,
		Signals:  signals,
		Alerts:   alerts,
		Summary:  summary,
	}
}
