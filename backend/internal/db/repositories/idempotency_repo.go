package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type IdempotencyRepo struct {
	pool *pgxpool.Pool
}

func NewIdempotencyRepo(pool *pgxpool.Pool) *IdempotencyRepo {
	return &IdempotencyRepo{pool: pool}
}

func (r *IdempotencyRepo) Exists(ctx context.Context, tenantID uuid.UUID, key, scope string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM idempotency_keys
			WHERE tenant_id = $1 AND key = $2 AND scope = $3
		)`, tenantID, key, scope,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking idempotency key: %w", err)
	}
	return exists, nil
}

func (r *IdempotencyRepo) Create(ctx context.Context, tenantID uuid.UUID, key, scope string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO idempotency_keys (tenant_id, key, scope)
		VALUES ($1, $2, $3)
		ON CONFLICT (tenant_id, key, scope) DO NOTHING`,
		tenantID, key, scope,
	)
	if err != nil && err != pgx.ErrNoRows {
		return fmt.Errorf("creating idempotency key: %w", err)
	}
	return nil
}
