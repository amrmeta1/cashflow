package models

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// VendorStats represents aggregated spending statistics for a vendor
type VendorStats struct {
	ID                uuid.UUID  `json:"id"`
	TenantID          uuid.UUID  `json:"tenant_id"`
	VendorID          uuid.UUID  `json:"vendor_id"`
	TotalSpend        float64    `json:"total_spend"`       // Net amount (inflow - outflow)
	TransactionCount  int        `json:"transaction_count"` // Total transactions
	AvgTransaction    float64    `json:"avg_transaction"`   // Average of all transactions
	TotalInflow       float64    `json:"total_inflow"`      // Total received from vendor
	TotalOutflow      float64    `json:"total_outflow"`     // Total paid to vendor (positive)
	InflowCount       int        `json:"inflow_count"`      // Number of inflow transactions
	OutflowCount      int        `json:"outflow_count"`     // Number of outflow transactions
	AvgInflow         float64    `json:"avg_inflow"`        // Average inflow amount
	AvgOutflow        float64    `json:"avg_outflow"`       // Average outflow amount
	LastTransactionAt *time.Time `json:"last_transaction_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// VendorStatsWithVendor represents vendor stats joined with vendor details for API responses
type VendorStatsWithVendor struct {
	VendorID          uuid.UUID  `json:"vendor_id"`
	VendorName        string     `json:"vendor_name"`
	TotalSpend        float64    `json:"total_spend"`       // Net amount
	TransactionCount  int        `json:"transaction_count"` // Total transactions
	AvgTransaction    float64    `json:"avg_transaction"`   // Average of all transactions
	TotalInflow       float64    `json:"total_inflow"`      // Total received
	TotalOutflow      float64    `json:"total_outflow"`     // Total paid (positive)
	InflowCount       int        `json:"inflow_count"`      // Inflow transaction count
	OutflowCount      int        `json:"outflow_count"`     // Outflow transaction count
	AvgInflow         float64    `json:"avg_inflow"`        // Average inflow
	AvgOutflow        float64    `json:"avg_outflow"`       // Average outflow
	LastTransactionAt *time.Time `json:"last_transaction_at,omitempty"`
}

// VendorStatsRepository defines the interface for vendor statistics data access
type VendorStatsRepository interface {
	// UpsertStats updates or inserts vendor statistics for a single transaction
	UpsertStats(ctx context.Context, tenantID, vendorID uuid.UUID, amount float64, txnDate time.Time) error

	// GetTopVendors retrieves top vendors by total spend for a tenant
	GetTopVendors(ctx context.Context, tenantID uuid.UUID, limit int) ([]VendorStatsWithVendor, error)

	// GetByVendorID retrieves statistics for a specific vendor
	GetByVendorID(ctx context.Context, tenantID, vendorID uuid.UUID) (*VendorStats, error)
}
