package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/models"
)

type VendorStatsRepo struct {
	pool *pgxpool.Pool
}

func NewVendorStatsRepo(pool *pgxpool.Pool) *VendorStatsRepo {
	return &VendorStatsRepo{pool: pool}
}

var _ models.VendorStatsRepository = (*VendorStatsRepo)(nil)

// UpsertStats updates or inserts vendor statistics for a single transaction
// Tracks inflows (positive amounts) and outflows (negative amounts) separately
// Uses absolute amounts for average calculations
func (r *VendorStatsRepo) UpsertStats(ctx context.Context, tenantID, vendorID uuid.UUID, amount float64, txnDate time.Time) error {
	// Determine if this is an inflow or outflow
	isOutflow := amount < 0
	absAmount := amount
	if isOutflow {
		absAmount = -amount // Convert to positive for outflow tracking
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO vendor_stats (
			tenant_id, vendor_id, 
			total_spend, transaction_count, avg_transaction,
			total_inflow, total_outflow, 
			inflow_count, outflow_count,
			avg_inflow, avg_outflow,
			last_transaction_at, created_at, updated_at
		) VALUES (
			$1, $2, 
			$3, 1, $4,
			CASE WHEN $5 = false THEN $3 ELSE 0 END,  -- total_inflow
			CASE WHEN $5 = true THEN $4 ELSE 0 END,   -- total_outflow (absolute)
			CASE WHEN $5 = false THEN 1 ELSE 0 END,   -- inflow_count
			CASE WHEN $5 = true THEN 1 ELSE 0 END,    -- outflow_count
			CASE WHEN $5 = false THEN $3 ELSE 0 END,  -- avg_inflow
			CASE WHEN $5 = true THEN $4 ELSE 0 END,   -- avg_outflow
			$6, NOW(), NOW()
		)
		ON CONFLICT (tenant_id, vendor_id) 
		DO UPDATE SET
			-- Update totals
			total_spend = vendor_stats.total_spend + EXCLUDED.total_spend,
			transaction_count = vendor_stats.transaction_count + 1,
			
			-- Update inflow tracking
			total_inflow = vendor_stats.total_inflow + EXCLUDED.total_inflow,
			inflow_count = vendor_stats.inflow_count + EXCLUDED.inflow_count,
			avg_inflow = CASE 
				WHEN (vendor_stats.inflow_count + EXCLUDED.inflow_count) > 0 
				THEN (vendor_stats.total_inflow + EXCLUDED.total_inflow) / (vendor_stats.inflow_count + EXCLUDED.inflow_count)
				ELSE 0 
			END,
			
			-- Update outflow tracking
			total_outflow = vendor_stats.total_outflow + EXCLUDED.total_outflow,
			outflow_count = vendor_stats.outflow_count + EXCLUDED.outflow_count,
			avg_outflow = CASE 
				WHEN (vendor_stats.outflow_count + EXCLUDED.outflow_count) > 0 
				THEN (vendor_stats.total_outflow + EXCLUDED.total_outflow) / (vendor_stats.outflow_count + EXCLUDED.outflow_count)
				ELSE 0 
			END,
			
			-- Update overall average using absolute amounts
			avg_transaction = (
				(vendor_stats.total_inflow + EXCLUDED.total_inflow) + 
				(vendor_stats.total_outflow + EXCLUDED.total_outflow)
			) / (vendor_stats.transaction_count + 1),
			
			-- Update last transaction timestamp
			last_transaction_at = CASE 
				WHEN EXCLUDED.last_transaction_at > COALESCE(vendor_stats.last_transaction_at, '1970-01-01'::timestamptz)
				THEN EXCLUDED.last_transaction_at 
				ELSE vendor_stats.last_transaction_at 
			END,
			updated_at = NOW()`,
		tenantID, vendorID, amount, absAmount, isOutflow, txnDate,
	)
	if err != nil {
		return fmt.Errorf("upserting vendor stats: %w", err)
	}

	return nil
}

// GetTopVendors retrieves top vendors by total spend for a tenant
func (r *VendorStatsRepo) GetTopVendors(ctx context.Context, tenantID uuid.UUID, limit int) ([]models.VendorStatsWithVendor, error) {
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	rows, err := r.pool.Query(ctx, `
		SELECT 
			vs.vendor_id,
			v.canonical_name,
			vs.total_spend,
			vs.transaction_count,
			vs.avg_transaction,
			vs.total_inflow,
			vs.total_outflow,
			vs.inflow_count,
			vs.outflow_count,
			vs.avg_inflow,
			vs.avg_outflow,
			vs.last_transaction_at
		FROM vendor_stats vs
		INNER JOIN vendors v ON v.id = vs.vendor_id
		WHERE vs.tenant_id = $1
		ORDER BY vs.total_outflow DESC  -- Order by outflow (expenses) for most relevant vendors
		LIMIT $2`,
		tenantID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("querying top vendors: %w", err)
	}
	defer rows.Close()

	var results []models.VendorStatsWithVendor
	for rows.Next() {
		var stat models.VendorStatsWithVendor
		err := rows.Scan(
			&stat.VendorID,
			&stat.VendorName,
			&stat.TotalSpend,
			&stat.TransactionCount,
			&stat.AvgTransaction,
			&stat.TotalInflow,
			&stat.TotalOutflow,
			&stat.InflowCount,
			&stat.OutflowCount,
			&stat.AvgInflow,
			&stat.AvgOutflow,
			&stat.LastTransactionAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning vendor stats: %w", err)
		}
		results = append(results, stat)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating vendor stats: %w", err)
	}

	return results, nil
}

// GetByVendorID retrieves statistics for a specific vendor
func (r *VendorStatsRepo) GetByVendorID(ctx context.Context, tenantID, vendorID uuid.UUID) (*models.VendorStats, error) {
	var stats models.VendorStats
	err := r.pool.QueryRow(ctx, `
		SELECT 
			id, tenant_id, vendor_id, 
			total_spend, transaction_count, avg_transaction,
			total_inflow, total_outflow,
			inflow_count, outflow_count,
			avg_inflow, avg_outflow,
			last_transaction_at, created_at, updated_at
		FROM vendor_stats
		WHERE tenant_id = $1 AND vendor_id = $2`,
		tenantID, vendorID,
	).Scan(
		&stats.ID, &stats.TenantID, &stats.VendorID,
		&stats.TotalSpend, &stats.TransactionCount, &stats.AvgTransaction,
		&stats.TotalInflow, &stats.TotalOutflow,
		&stats.InflowCount, &stats.OutflowCount,
		&stats.AvgInflow, &stats.AvgOutflow,
		&stats.LastTransactionAt, &stats.CreatedAt, &stats.UpdatedAt,
	)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, fmt.Errorf("getting vendor stats: %w", err)
	}

	return &stats, nil
}
