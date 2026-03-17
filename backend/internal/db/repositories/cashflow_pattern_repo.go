package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/models"
)

type CashFlowPatternRepo struct {
	pool *pgxpool.Pool
}

func NewCashFlowPatternRepo(pool *pgxpool.Pool) *CashFlowPatternRepo {
	return &CashFlowPatternRepo{pool: pool}
}

var _ models.CashFlowPatternRepository = (*CashFlowPatternRepo)(nil)

// UpsertPattern inserts or updates a pattern
func (r *CashFlowPatternRepo) UpsertPattern(ctx context.Context, pattern *models.CashFlowPattern) error {
	// Marshal metadata to JSON
	var metadataJSON []byte
	var err error
	if pattern.Metadata != nil {
		metadataJSON, err = json.Marshal(pattern.Metadata)
		if err != nil {
			return fmt.Errorf("marshaling metadata: %w", err)
		}
	}

	err = r.pool.QueryRow(ctx, `
		INSERT INTO cashflow_patterns (
			tenant_id, pattern_type, vendor_id, frequency,
			avg_amount, amount_variance, confidence, occurrence_count,
			last_detected, next_expected, metadata, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
		ON CONFLICT (tenant_id, pattern_type, COALESCE(vendor_id, '00000000-0000-0000-0000-000000000000'::uuid), frequency)
		DO UPDATE SET
			avg_amount = EXCLUDED.avg_amount,
			amount_variance = EXCLUDED.amount_variance,
			confidence = EXCLUDED.confidence,
			occurrence_count = EXCLUDED.occurrence_count,
			last_detected = EXCLUDED.last_detected,
			next_expected = EXCLUDED.next_expected,
			metadata = EXCLUDED.metadata,
			updated_at = NOW()
		RETURNING id`,
		pattern.TenantID, pattern.PatternType, pattern.VendorID, pattern.Frequency,
		pattern.AvgAmount, pattern.AmountVariance, pattern.Confidence, pattern.OccurrenceCount,
		pattern.LastDetected, pattern.NextExpected, metadataJSON,
	).Scan(&pattern.ID)

	if err != nil {
		return fmt.Errorf("upserting pattern: %w", err)
	}

	return nil
}

// GetPatternsByTenant retrieves all patterns for a tenant above minimum confidence
func (r *CashFlowPatternRepo) GetPatternsByTenant(ctx context.Context, tenantID uuid.UUID, minConfidence float64) ([]models.CashFlowPatternWithVendor, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT 
			p.id, p.tenant_id, p.pattern_type, p.vendor_id, p.frequency,
			p.avg_amount, p.amount_variance, p.confidence, p.occurrence_count,
			p.last_detected, p.next_expected, p.metadata, p.created_at, p.updated_at,
			v.canonical_name
		FROM cashflow_patterns p
		LEFT JOIN vendors v ON v.id = p.vendor_id
		WHERE p.tenant_id = $1 AND p.confidence >= $2
		ORDER BY p.confidence DESC, p.avg_amount DESC`,
		tenantID, minConfidence,
	)
	if err != nil {
		return nil, fmt.Errorf("querying patterns: %w", err)
	}
	defer rows.Close()

	var patterns []models.CashFlowPatternWithVendor
	for rows.Next() {
		var p models.CashFlowPatternWithVendor
		var metadataJSON []byte
		var vendorName *string

		err := rows.Scan(
			&p.ID, &p.TenantID, &p.PatternType, &p.VendorID, &p.Frequency,
			&p.AvgAmount, &p.AmountVariance, &p.Confidence, &p.OccurrenceCount,
			&p.LastDetected, &p.NextExpected, &metadataJSON, &p.CreatedAt, &p.UpdatedAt,
			&vendorName,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning pattern: %w", err)
		}

		// Unmarshal metadata
		if metadataJSON != nil {
			if err := json.Unmarshal(metadataJSON, &p.Metadata); err != nil {
				return nil, fmt.Errorf("unmarshaling metadata: %w", err)
			}
		}

		// Set vendor name
		if vendorName != nil {
			p.VendorName = *vendorName
		}

		patterns = append(patterns, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating patterns: %w", err)
	}

	return patterns, nil
}

// GetPatternsByType retrieves patterns of a specific type for a tenant
func (r *CashFlowPatternRepo) GetPatternsByType(ctx context.Context, tenantID uuid.UUID, patternType string) ([]models.CashFlowPatternWithVendor, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT 
			p.id, p.tenant_id, p.pattern_type, p.vendor_id, p.frequency,
			p.avg_amount, p.amount_variance, p.confidence, p.occurrence_count,
			p.last_detected, p.next_expected, p.metadata, p.created_at, p.updated_at,
			v.canonical_name
		FROM cashflow_patterns p
		LEFT JOIN vendors v ON v.id = p.vendor_id
		WHERE p.tenant_id = $1 AND p.pattern_type = $2
		ORDER BY p.confidence DESC`,
		tenantID, patternType,
	)
	if err != nil {
		return nil, fmt.Errorf("querying patterns by type: %w", err)
	}
	defer rows.Close()

	var patterns []models.CashFlowPatternWithVendor
	for rows.Next() {
		var p models.CashFlowPatternWithVendor
		var metadataJSON []byte
		var vendorName *string

		err := rows.Scan(
			&p.ID, &p.TenantID, &p.PatternType, &p.VendorID, &p.Frequency,
			&p.AvgAmount, &p.AmountVariance, &p.Confidence, &p.OccurrenceCount,
			&p.LastDetected, &p.NextExpected, &metadataJSON, &p.CreatedAt, &p.UpdatedAt,
			&vendorName,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning pattern: %w", err)
		}

		// Unmarshal metadata
		if metadataJSON != nil {
			if err := json.Unmarshal(metadataJSON, &p.Metadata); err != nil {
				return nil, fmt.Errorf("unmarshaling metadata: %w", err)
			}
		}

		// Set vendor name
		if vendorName != nil {
			p.VendorName = *vendorName
		}

		patterns = append(patterns, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating patterns: %w", err)
	}

	return patterns, nil
}

// DeleteStalePatterns removes patterns not detected recently
func (r *CashFlowPatternRepo) DeleteStalePatterns(ctx context.Context, tenantID uuid.UUID, olderThan time.Time) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM cashflow_patterns
		WHERE tenant_id = $1 AND last_detected < $2`,
		tenantID, olderThan,
	)
	if err != nil {
		return fmt.Errorf("deleting stale patterns: %w", err)
	}

	return nil
}

// GetPattern retrieves a specific pattern by ID
func (r *CashFlowPatternRepo) GetPattern(ctx context.Context, tenantID uuid.UUID, patternID uuid.UUID) (*models.CashFlowPattern, error) {
	var p models.CashFlowPattern
	var metadataJSON []byte

	err := r.pool.QueryRow(ctx, `
		SELECT 
			id, tenant_id, pattern_type, vendor_id, frequency,
			avg_amount, amount_variance, confidence, occurrence_count,
			last_detected, next_expected, metadata, created_at, updated_at
		FROM cashflow_patterns
		WHERE tenant_id = $1 AND id = $2`,
		tenantID, patternID,
	).Scan(
		&p.ID, &p.TenantID, &p.PatternType, &p.VendorID, &p.Frequency,
		&p.AvgAmount, &p.AmountVariance, &p.Confidence, &p.OccurrenceCount,
		&p.LastDetected, &p.NextExpected, &metadataJSON, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, fmt.Errorf("getting pattern: %w", err)
	}

	// Unmarshal metadata
	if metadataJSON != nil {
		if err := json.Unmarshal(metadataJSON, &p.Metadata); err != nil {
			return nil, fmt.Errorf("unmarshaling metadata: %w", err)
		}
	}

	return &p, nil
}
