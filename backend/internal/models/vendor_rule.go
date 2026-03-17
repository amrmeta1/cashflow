package models

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// VendorRule represents a learned vendor/category mapping from user corrections
type VendorRule struct {
	ID                uuid.UUID `json:"id"`
	TenantID          uuid.UUID `json:"tenant_id"`
	Pattern           string    `json:"pattern"`
	NormalizedPattern string    `json:"normalized_pattern"`
	VendorName        string    `json:"vendor_name"`
	Category          string    `json:"category"`
	Confidence        float64   `json:"confidence"`
	Source            string    `json:"source"`
	TimesApplied      int       `json:"times_applied"`
	TimesConfirmed    int       `json:"times_confirmed"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// CreateVendorRuleInput represents the input for creating a new vendor rule
type CreateVendorRuleInput struct {
	Pattern    string  `json:"pattern"`
	VendorName string  `json:"vendor_name"`
	Category   string  `json:"category"`
	Confidence float64 `json:"confidence,omitempty"`
	Source     string  `json:"source,omitempty"`
}

// RuleMatch represents a matched vendor rule with its details
type RuleMatch struct {
	RuleID     uuid.UUID `json:"rule_id"`
	VendorName string    `json:"vendor_name"`
	Category   string    `json:"category"`
	Confidence float64   `json:"confidence"`
}

// VendorRuleRepository defines the interface for vendor rule data access
type VendorRuleRepository interface {
	// Create creates a new vendor rule for a tenant
	Create(ctx context.Context, tenantID uuid.UUID, input CreateVendorRuleInput) (*VendorRule, error)

	// FindMatches finds all matching vendor rules for the given normalized text
	// Returns rules sorted by confidence DESC, times_confirmed DESC, updated_at DESC
	FindMatches(ctx context.Context, tenantID uuid.UUID, normalizedText string) ([]VendorRule, error)

	// IncrementCounters increments the usage counters for a rule
	IncrementCounters(ctx context.Context, ruleID uuid.UUID, applied bool, confirmed bool) error

	// List retrieves all vendor rules for a tenant, optionally filtered by status
	List(ctx context.Context, tenantID uuid.UUID, status string) ([]VendorRule, error)

	// GetByID retrieves a specific vendor rule
	GetByID(ctx context.Context, tenantID uuid.UUID, ruleID uuid.UUID) (*VendorRule, error)
}
