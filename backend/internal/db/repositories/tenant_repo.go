package repositories

import (
"github.com/finch-co/cashflow/internal/models"
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TenantRepo struct {
	pool *pgxpool.Pool
}

func NewTenantRepo(pool *pgxpool.Pool) *TenantRepo {
	return &TenantRepo{pool: pool}
}

func (r *TenantRepo) Create(ctx context.Context, input models.CreateTenantInput) (*models.Tenant, error) {
	meta, err := json.Marshal(input.Metadata)
	if err != nil {
		meta = []byte("{}")
	}

	plan := input.Plan
	if plan == "" {
		plan = "free"
	}

	var t models.Tenant
	var metaBytes []byte
	err = r.pool.QueryRow(ctx,
		`INSERT INTO tenants (name, slug, plan, metadata)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, name, slug, plan, status, metadata, created_at, updated_at`,
		input.Name, input.Slug, plan, meta,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &metaBytes, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("creating tenant: %w", err)
	}
	_ = json.Unmarshal(metaBytes, &t.Metadata)
	return &t, nil
}

func (r *TenantRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Tenant, error) {
	var t models.Tenant
	var metaBytes []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, slug, plan, status, metadata, created_at, updated_at
		 FROM tenants WHERE id = $1 AND status != 'deleted'`, id,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &metaBytes, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, models.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting tenant: %w", err)
	}
	_ = json.Unmarshal(metaBytes, &t.Metadata)
	return &t, nil
}

func (r *TenantRepo) GetBySlug(ctx context.Context, slug string) (*models.Tenant, error) {
	var t models.Tenant
	var metaBytes []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, slug, plan, status, metadata, created_at, updated_at
		 FROM tenants WHERE slug = $1 AND status != 'deleted'`, slug,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &metaBytes, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, models.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting tenant by slug: %w", err)
	}
	_ = json.Unmarshal(metaBytes, &t.Metadata)
	return &t, nil
}

func (r *TenantRepo) List(ctx context.Context, limit, offset int) ([]models.Tenant, int, error) {
	var total int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tenants WHERE status != 'deleted'`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting tenants: %w", err)
	}

	rows, err := r.pool.Query(ctx,
		`SELECT id, name, slug, plan, status, metadata, created_at, updated_at
		 FROM tenants WHERE status != 'deleted'
		 ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("listing tenants: %w", err)
	}
	defer rows.Close()

	var tenants []models.Tenant
	for rows.Next() {
		var t models.Tenant
		var metaBytes []byte
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &metaBytes, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scanning tenant: %w", err)
		}
		_ = json.Unmarshal(metaBytes, &t.Metadata)
		tenants = append(tenants, t)
	}
	return tenants, total, nil
}

func (r *TenantRepo) Update(ctx context.Context, id uuid.UUID, input models.UpdateTenantInput) (*models.Tenant, error) {
	existing, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	name := existing.Name
	if input.Name != nil {
		name = *input.Name
	}
	plan := existing.Plan
	if input.Plan != nil {
		plan = *input.Plan
	}
	status := existing.Status
	if input.Status != nil {
		status = *input.Status
	}
	metadata := existing.Metadata
	if input.Metadata != nil {
		metadata = *input.Metadata
	}

	meta, _ := json.Marshal(metadata)

	var t models.Tenant
	var metaBytes []byte
	err = r.pool.QueryRow(ctx,
		`UPDATE tenants SET name=$1, plan=$2, status=$3, metadata=$4, updated_at=now()
		 WHERE id=$5
		 RETURNING id, name, slug, plan, status, metadata, created_at, updated_at`,
		name, plan, status, meta, id,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &metaBytes, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("updating tenant: %w", err)
	}
	_ = json.Unmarshal(metaBytes, &t.Metadata)
	return &t, nil
}

func (r *TenantRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE tenants SET status='deleted', updated_at=now() WHERE id=$1 AND status != 'deleted'`, id,
	)
	if err != nil {
		return fmt.Errorf("deleting tenant: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}
