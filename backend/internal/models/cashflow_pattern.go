package models

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Pattern type constants
const (
	PatternTypeRecurringVendor = "recurring_vendor"
	PatternTypePayroll         = "payroll"
	PatternTypeSubscription    = "subscription"
	PatternTypeBurnRate        = "burn_rate"
)

// Frequency constants
const (
	FrequencyDaily     = "daily"
	FrequencyWeekly    = "weekly"
	FrequencyBiweekly  = "biweekly"
	FrequencyMonthly   = "monthly"
	FrequencyQuarterly = "quarterly"
)

// CashFlowPattern represents an automatically detected recurring financial pattern
type CashFlowPattern struct {
	ID              uuid.UUID              `json:"id"`
	TenantID        uuid.UUID              `json:"tenant_id"`
	PatternType     string                 `json:"pattern_type"`
	VendorID        *uuid.UUID             `json:"vendor_id,omitempty"`
	Frequency       string                 `json:"frequency"`
	AvgAmount       float64                `json:"avg_amount"`
	AmountVariance  *float64               `json:"amount_variance,omitempty"`
	Confidence      float64                `json:"confidence"`
	OccurrenceCount int                    `json:"occurrence_count"`
	LastDetected    time.Time              `json:"last_detected"`
	NextExpected    *time.Time             `json:"next_expected,omitempty"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

// CashFlowPatternWithVendor includes vendor name for API responses
type CashFlowPatternWithVendor struct {
	CashFlowPattern
	VendorName string `json:"vendor_name,omitempty"`
}

// CashFlowPatternRepository defines the interface for pattern data access
type CashFlowPatternRepository interface {
	// UpsertPattern inserts or updates a pattern
	UpsertPattern(ctx context.Context, pattern *CashFlowPattern) error

	// GetPatternsByTenant retrieves all patterns for a tenant above minimum confidence
	GetPatternsByTenant(ctx context.Context, tenantID uuid.UUID, minConfidence float64) ([]CashFlowPatternWithVendor, error)

	// GetPatternsByType retrieves patterns of a specific type for a tenant
	GetPatternsByType(ctx context.Context, tenantID uuid.UUID, patternType string) ([]CashFlowPatternWithVendor, error)

	// DeleteStalePatterns removes patterns not detected recently
	DeleteStalePatterns(ctx context.Context, tenantID uuid.UUID, olderThan time.Time) error

	// GetPattern retrieves a specific pattern by ID
	GetPattern(ctx context.Context, tenantID uuid.UUID, patternID uuid.UUID) (*CashFlowPattern, error)
}
