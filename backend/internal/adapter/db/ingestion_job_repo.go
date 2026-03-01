package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/domain"
)

type IngestionJobRepo struct {
	pool *pgxpool.Pool
}

func NewIngestionJobRepo(pool *pgxpool.Pool) *IngestionJobRepo {
	return &IngestionJobRepo{pool: pool}
}

func (r *IngestionJobRepo) Create(ctx context.Context, tenantID uuid.UUID, input domain.CreateIngestionJobInput) (*domain.IngestionJob, error) {
	var job domain.IngestionJob
	err := r.pool.QueryRow(ctx, `
		INSERT INTO ingestion_jobs (tenant_id, job_type, metadata)
		VALUES ($1, $2, $3)
		RETURNING id, tenant_id, job_type, status, metadata, scheduled_at, started_at, finished_at, error, created_at`,
		tenantID, input.JobType, mapToJSON(input.Metadata),
	).Scan(
		&job.ID, &job.TenantID, &job.JobType, &job.Status, &job.Metadata,
		&job.ScheduledAt, &job.StartedAt, &job.FinishedAt, &job.Error, &job.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating ingestion job: %w", err)
	}
	return &job, nil
}

func (r *IngestionJobRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.IngestionJob, error) {
	var job domain.IngestionJob
	err := r.pool.QueryRow(ctx, `
		SELECT id, tenant_id, job_type, status, metadata, scheduled_at, started_at, finished_at, error, created_at
		FROM ingestion_jobs
		WHERE id = $1`,
		id,
	).Scan(
		&job.ID, &job.TenantID, &job.JobType, &job.Status, &job.Metadata,
		&job.ScheduledAt, &job.StartedAt, &job.FinishedAt, &job.Error, &job.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("getting ingestion job: %w", err)
	}
	return &job, nil
}

func (r *IngestionJobRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.JobStatus, errMsg string) error {
	now := time.Now().UTC()
	var query string
	var args []any

	switch status {
	case domain.JobStatusRunning:
		query = `UPDATE ingestion_jobs SET status = $2, started_at = $3 WHERE id = $1`
		args = []any{id, status, now}
	case domain.JobStatusCompleted:
		query = `UPDATE ingestion_jobs SET status = $2, finished_at = $3 WHERE id = $1`
		args = []any{id, status, now}
	case domain.JobStatusFailed:
		query = `UPDATE ingestion_jobs SET status = $2, finished_at = $3, error = $4 WHERE id = $1`
		args = []any{id, status, now, errMsg}
	default:
		query = `UPDATE ingestion_jobs SET status = $2 WHERE id = $1`
		args = []any{id, status}
	}

	_, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("updating ingestion job status: %w", err)
	}
	return nil
}
