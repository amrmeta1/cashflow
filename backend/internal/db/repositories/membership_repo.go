package repositories

import (
"github.com/finch-co/cashflow/internal/models"
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MembershipRepo struct {
	pool *pgxpool.Pool
}

func NewMembershipRepo(pool *pgxpool.Pool) *MembershipRepo {
	return &MembershipRepo{pool: pool}
}

const memberCols = `id, tenant_id, user_id, role, status, created_at, updated_at`

func scanMembership(row pgx.Row) (*models.Membership, error) {
	var m models.Membership
	err := row.Scan(&m.ID, &m.TenantID, &m.UserID, &m.Role, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	return &m, err
}

func (r *MembershipRepo) Create(ctx context.Context, tenantID uuid.UUID, input models.CreateMembershipInput) (*models.Membership, error) {
	m, err := scanMembership(r.pool.QueryRow(ctx,
		`INSERT INTO memberships (tenant_id, user_id, role)
		 VALUES ($1, $2, $3)
		 RETURNING `+memberCols,
		tenantID, input.UserID, input.Role,
	))
	if err != nil {
		return nil, fmt.Errorf("creating membership: %w", err)
	}
	return m, nil
}

func (r *MembershipRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Membership, error) {
	m, err := scanMembership(r.pool.QueryRow(ctx,
		`SELECT `+memberCols+` FROM memberships WHERE id = $1`, id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, models.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting membership: %w", err)
	}
	return m, nil
}

func (r *MembershipRepo) GetByTenantAndUser(ctx context.Context, tenantID, userID uuid.UUID) (*models.Membership, error) {
	m, err := scanMembership(r.pool.QueryRow(ctx,
		`SELECT `+memberCols+` FROM memberships WHERE tenant_id = $1 AND user_id = $2`, tenantID, userID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, models.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting membership: %w", err)
	}
	return m, nil
}

func (r *MembershipRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.Membership, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM memberships WHERE tenant_id = $1`, tenantID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting memberships: %w", err)
	}

	rows, err := r.pool.Query(ctx,
		`SELECT `+memberCols+` FROM memberships WHERE tenant_id = $1
		 ORDER BY created_at LIMIT $2 OFFSET $3`, tenantID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("listing memberships: %w", err)
	}
	defer rows.Close()

	var memberships []models.Membership
	for rows.Next() {
		var m models.Membership
		if err := rows.Scan(&m.ID, &m.TenantID, &m.UserID, &m.Role, &m.Status, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scanning membership: %w", err)
		}
		memberships = append(memberships, m)
	}
	return memberships, total, nil
}

func (r *MembershipRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]models.Membership, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+memberCols+` FROM memberships WHERE user_id = $1 ORDER BY created_at`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing memberships by user: %w", err)
	}
	defer rows.Close()

	var memberships []models.Membership
	for rows.Next() {
		var m models.Membership
		if err := rows.Scan(&m.ID, &m.TenantID, &m.UserID, &m.Role, &m.Status, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning membership: %w", err)
		}
		memberships = append(memberships, m)
	}
	return memberships, nil
}

func (r *MembershipRepo) UpdateRole(ctx context.Context, id uuid.UUID, role string) (*models.Membership, error) {
	m, err := scanMembership(r.pool.QueryRow(ctx,
		`UPDATE memberships SET role=$1, updated_at=now()
		 WHERE id=$2
		 RETURNING `+memberCols,
		role, id,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, models.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("updating membership role: %w", err)
	}
	return m, nil
}

func (r *MembershipRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM memberships WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting membership: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}
