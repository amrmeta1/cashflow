package models

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Vendor represents a canonical vendor identity
type Vendor struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenant_id"`
	CanonicalName   string     `json:"canonical_name"`
	NormalizedName  string     `json:"normalized_name"`
	VendorType      *string    `json:"vendor_type,omitempty"`
	DefaultCategory *string    `json:"default_category,omitempty"`
	Confidence      float64    `json:"confidence"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// CreateVendorInput represents input for creating a vendor
type CreateVendorInput struct {
	CanonicalName   string
	VendorType      *string
	DefaultCategory *string
}

// VendorRepository defines the interface for vendor data access
type VendorRepository interface {
	// Create creates a new vendor
	Create(ctx context.Context, tenantID uuid.UUID, input CreateVendorInput) (*Vendor, error)

	// FindByNormalizedName finds a vendor by normalized name (exact or contains match)
	FindByNormalizedName(ctx context.Context, tenantID uuid.UUID, normalizedName string) (*Vendor, error)

	// GetByID retrieves a vendor by ID
	GetByID(ctx context.Context, tenantID uuid.UUID, vendorID uuid.UUID) (*Vendor, error)

	// List retrieves all vendors for a tenant with pagination
	List(ctx context.Context, tenantID uuid.UUID, limit int, offset int) ([]Vendor, int, error)
}
