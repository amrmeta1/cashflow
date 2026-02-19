package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/domain"
)

type PermissionRepo struct {
	pool *pgxpool.Pool
}

func NewPermissionRepo(pool *pgxpool.Pool) *PermissionRepo {
	return &PermissionRepo{pool: pool}
}

func (r *PermissionRepo) List(ctx context.Context) ([]domain.Permission, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, resource, action, description, created_at
		 FROM permissions ORDER BY resource, action`,
	)
	if err != nil {
		return nil, fmt.Errorf("listing permissions: %w", err)
	}
	defer rows.Close()

	var perms []domain.Permission
	for rows.Next() {
		var p domain.Permission
		if err := rows.Scan(&p.ID, &p.Resource, &p.Action, &p.Description, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning permission: %w", err)
		}
		perms = append(perms, p)
	}
	return perms, nil
}

func (r *PermissionRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Permission, error) {
	var p domain.Permission
	err := r.pool.QueryRow(ctx,
		`SELECT id, resource, action, description, created_at
		 FROM permissions WHERE id = $1`, id,
	).Scan(&p.ID, &p.Resource, &p.Action, &p.Description, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting permission: %w", err)
	}
	return &p, nil
}
