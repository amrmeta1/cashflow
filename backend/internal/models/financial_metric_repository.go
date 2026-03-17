package models

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// FinancialMetricRepository defines persistence operations for financial metrics
type FinancialMetricRepository interface {
	Create(ctx context.Context, input CreateMetricInput) (*FinancialMetric, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*FinancialMetric, error)
	ListByTenant(ctx context.Context, filter MetricFilter) ([]FinancialMetric, error)
	GetLatestMetric(ctx context.Context, tenantID uuid.UUID, metricName string) (*FinancialMetric, error)
	GetMetricTimeSeries(ctx context.Context, tenantID uuid.UUID, metricName string, limit int) ([]FinancialMetric, error)
}

// FinancialMetricRepo implements FinancialMetricRepository using PostgreSQL
type FinancialMetricRepo struct {
	pool *pgxpool.Pool
}

// NewFinancialMetricRepo creates a new financial metric repository
func NewFinancialMetricRepo(pool *pgxpool.Pool) *FinancialMetricRepo {
	return &FinancialMetricRepo{pool: pool}
}

func (r *FinancialMetricRepo) Create(ctx context.Context, input CreateMetricInput) (*FinancialMetric, error) {
	metadata, err := json.Marshal(input.Metadata)
	if err != nil {
		metadata = []byte("{}")
	}

	var metric FinancialMetric
	var metaBytes []byte
	err = r.pool.QueryRow(ctx,
		`INSERT INTO financial_metrics (tenant_id, metric_name, metric_value, period_start, period_end, metadata)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, metric_name, metric_value, period_start, period_end, created_at, metadata`,
		input.TenantID, input.MetricName, input.MetricValue, input.PeriodStart, input.PeriodEnd, metadata,
	).Scan(&metric.ID, &metric.TenantID, &metric.MetricName, &metric.MetricValue, &metric.PeriodStart, &metric.PeriodEnd, &metric.CreatedAt, &metaBytes)
	if err != nil {
		return nil, fmt.Errorf("creating financial metric: %w", err)
	}
	_ = json.Unmarshal(metaBytes, &metric.Metadata)
	return &metric, nil
}

func (r *FinancialMetricRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*FinancialMetric, error) {
	var metric FinancialMetric
	var metaBytes []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, metric_name, metric_value, period_start, period_end, created_at, metadata
		 FROM financial_metrics WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	).Scan(&metric.ID, &metric.TenantID, &metric.MetricName, &metric.MetricValue, &metric.PeriodStart, &metric.PeriodEnd, &metric.CreatedAt, &metaBytes)
	if err != nil {
		return nil, fmt.Errorf("getting financial metric: %w", err)
	}
	_ = json.Unmarshal(metaBytes, &metric.Metadata)
	return &metric, nil
}

func (r *FinancialMetricRepo) ListByTenant(ctx context.Context, filter MetricFilter) ([]FinancialMetric, error) {
	query := `SELECT id, tenant_id, metric_name, metric_value, period_start, period_end, created_at, metadata
		 FROM financial_metrics WHERE tenant_id = $1`
	args := []interface{}{filter.TenantID}
	argIdx := 2

	if len(filter.MetricNames) > 0 {
		query += fmt.Sprintf(" AND metric_name = ANY($%d)", argIdx)
		args = append(args, filter.MetricNames)
		argIdx++
	}

	if filter.StartDate != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		args = append(args, filter.StartDate)
		argIdx++
	}

	if filter.EndDate != nil {
		query += fmt.Sprintf(" AND created_at <= $%d", argIdx)
		args = append(args, filter.EndDate)
		argIdx++
	}

	query += " ORDER BY created_at DESC"

	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIdx)
		args = append(args, filter.Limit)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("listing financial metrics: %w", err)
	}
	defer rows.Close()

	var metrics []FinancialMetric
	for rows.Next() {
		var metric FinancialMetric
		var metaBytes []byte
		if err := rows.Scan(&metric.ID, &metric.TenantID, &metric.MetricName, &metric.MetricValue, &metric.PeriodStart, &metric.PeriodEnd, &metric.CreatedAt, &metaBytes); err != nil {
			return nil, fmt.Errorf("scanning financial metric: %w", err)
		}
		_ = json.Unmarshal(metaBytes, &metric.Metadata)
		metrics = append(metrics, metric)
	}
	return metrics, nil
}

func (r *FinancialMetricRepo) GetLatestMetric(ctx context.Context, tenantID uuid.UUID, metricName string) (*FinancialMetric, error) {
	var metric FinancialMetric
	var metaBytes []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, metric_name, metric_value, period_start, period_end, created_at, metadata
		 FROM financial_metrics 
		 WHERE tenant_id = $1 AND metric_name = $2
		 ORDER BY created_at DESC LIMIT 1`,
		tenantID, metricName,
	).Scan(&metric.ID, &metric.TenantID, &metric.MetricName, &metric.MetricValue, &metric.PeriodStart, &metric.PeriodEnd, &metric.CreatedAt, &metaBytes)
	if err != nil {
		return nil, fmt.Errorf("getting latest metric: %w", err)
	}
	_ = json.Unmarshal(metaBytes, &metric.Metadata)
	return &metric, nil
}

func (r *FinancialMetricRepo) GetMetricTimeSeries(ctx context.Context, tenantID uuid.UUID, metricName string, limit int) ([]FinancialMetric, error) {
	if limit <= 0 {
		limit = 30
	}

	rows, err := r.pool.Query(ctx,
		`SELECT id, tenant_id, metric_name, metric_value, period_start, period_end, created_at, metadata
		 FROM financial_metrics 
		 WHERE tenant_id = $1 AND metric_name = $2
		 ORDER BY created_at DESC LIMIT $3`,
		tenantID, metricName, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("getting metric time series: %w", err)
	}
	defer rows.Close()

	var metrics []FinancialMetric
	for rows.Next() {
		var metric FinancialMetric
		var metaBytes []byte
		if err := rows.Scan(&metric.ID, &metric.TenantID, &metric.MetricName, &metric.MetricValue, &metric.PeriodStart, &metric.PeriodEnd, &metric.CreatedAt, &metaBytes); err != nil {
			return nil, fmt.Errorf("scanning metric: %w", err)
		}
		_ = json.Unmarshal(metaBytes, &metric.Metadata)
		metrics = append(metrics, metric)
	}
	return metrics, nil
}
