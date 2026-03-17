package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/models"
)

type VendorRepo struct {
	pool *pgxpool.Pool
}

func NewVendorRepo(pool *pgxpool.Pool) *VendorRepo {
	return &VendorRepo{pool: pool}
}

var _ models.VendorRepository = (*VendorRepo)(nil)

// normalizeVendorName normalizes a vendor name for matching
// Rules: trim whitespace, lowercase, collapse multiple spaces
func normalizeVendorName(name string) string {
	name = strings.TrimSpace(name)
	name = strings.ToLower(name)
	name = strings.Join(strings.Fields(name), " ")
	return name
}

// Create creates a new vendor
func (r *VendorRepo) Create(ctx context.Context, tenantID uuid.UUID, input models.CreateVendorInput) (*models.Vendor, error) {
	normalizedName := normalizeVendorName(input.CanonicalName)

	vendor := &models.Vendor{
		ID:              uuid.New(),
		TenantID:        tenantID,
		CanonicalName:   input.CanonicalName,
		NormalizedName:  normalizedName,
		VendorType:      input.VendorType,
		DefaultCategory: input.DefaultCategory,
		Confidence:      1.0,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO vendors (
			id, tenant_id, canonical_name, normalized_name, vendor_type,
			default_category, confidence, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		vendor.ID, vendor.TenantID, vendor.CanonicalName, vendor.NormalizedName,
		vendor.VendorType, vendor.DefaultCategory, vendor.Confidence,
		vendor.CreatedAt, vendor.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating vendor: %w", err)
	}

	return vendor, nil
}

// FindByNormalizedName finds a vendor by normalized name
// Matching logic: exact match first, then contains match
// Prefers longer (more specific) matches
// Filters out very short patterns (length <= 2) to prevent false matches
func (r *VendorRepo) FindByNormalizedName(ctx context.Context, tenantID uuid.UUID, normalizedName string) (*models.Vendor, error) {
	normalizedName = normalizeVendorName(normalizedName)

	var vendor models.Vendor
	err := r.pool.QueryRow(ctx, `
		SELECT 
			id, tenant_id, canonical_name, normalized_name, vendor_type,
			default_category, confidence, created_at, updated_at
		FROM vendors
		WHERE tenant_id = $1
			AND LENGTH(normalized_name) > 2  -- prevent false matches from short patterns
			AND (
				normalized_name = $2  -- exact match
				OR $2 LIKE '%' || normalized_name || '%'  -- contains match
			)
		ORDER BY LENGTH(normalized_name) DESC  -- prefer longest (most specific) matches first
		LIMIT 1`,
		tenantID, normalizedName,
	).Scan(
		&vendor.ID, &vendor.TenantID, &vendor.CanonicalName, &vendor.NormalizedName,
		&vendor.VendorType, &vendor.DefaultCategory, &vendor.Confidence,
		&vendor.CreatedAt, &vendor.UpdatedAt,
	)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil // No match found
		}
		return nil, fmt.Errorf("finding vendor by normalized name: %w", err)
	}

	return &vendor, nil
}

// GetByID retrieves a vendor by ID
func (r *VendorRepo) GetByID(ctx context.Context, tenantID uuid.UUID, vendorID uuid.UUID) (*models.Vendor, error) {
	var vendor models.Vendor
	err := r.pool.QueryRow(ctx, `
		SELECT 
			id, tenant_id, canonical_name, normalized_name, vendor_type,
			default_category, confidence, created_at, updated_at
		FROM vendors
		WHERE id = $1 AND tenant_id = $2`,
		vendorID, tenantID,
	).Scan(
		&vendor.ID, &vendor.TenantID, &vendor.CanonicalName, &vendor.NormalizedName,
		&vendor.VendorType, &vendor.DefaultCategory, &vendor.Confidence,
		&vendor.CreatedAt, &vendor.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("getting vendor by ID: %w", err)
	}

	return &vendor, nil
}

// List retrieves all vendors for a tenant with pagination
func (r *VendorRepo) List(ctx context.Context, tenantID uuid.UUID, limit int, offset int) ([]models.Vendor, int, error) {
	// Get total count
	var total int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM vendors WHERE tenant_id = $1`,
		tenantID,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting vendors: %w", err)
	}

	// Get paginated results
	rows, err := r.pool.Query(ctx, `
		SELECT 
			id, tenant_id, canonical_name, normalized_name, vendor_type,
			default_category, confidence, created_at, updated_at
		FROM vendors
		WHERE tenant_id = $1
		ORDER BY canonical_name ASC
		LIMIT $2 OFFSET $3`,
		tenantID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("listing vendors: %w", err)
	}
	defer rows.Close()

	var vendors []models.Vendor
	for rows.Next() {
		var vendor models.Vendor
		err := rows.Scan(
			&vendor.ID, &vendor.TenantID, &vendor.CanonicalName, &vendor.NormalizedName,
			&vendor.VendorType, &vendor.DefaultCategory, &vendor.Confidence,
			&vendor.CreatedAt, &vendor.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scanning vendor: %w", err)
		}
		vendors = append(vendors, vendor)
	}

	return vendors, total, nil
}
