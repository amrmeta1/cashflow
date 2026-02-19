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

type MembershipRepo struct {
	pool *pgxpool.Pool
}

func NewMembershipRepo(pool *pgxpool.Pool) *MembershipRepo {
	return &MembershipRepo{pool: pool}
}

func (r *MembershipRepo) Create(ctx context.Context, tenantID uuid.UUID, input domain.CreateMembershipInput) (*domain.Membership, error) {
	var m domain.Membership
	err := r.pool.QueryRow(ctx,
		`INSERT INTO memberships (tenant_id, user_id, role_id)
		 VALUES ($1, $2, $3)
		 RETURNING id, tenant_id, user_id, role_id, status, created_at, updated_at`,
		tenantID, input.UserID, input.RoleID,
	).Scan(&m.ID, &m.TenantID, &m.UserID, &m.RoleID, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("creating membership: %w", err)
	}
	return &m, nil
}

func (r *MembershipRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Membership, error) {
	var m domain.Membership
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, user_id, role_id, status, created_at, updated_at
		 FROM memberships WHERE id = $1`, id,
	).Scan(&m.ID, &m.TenantID, &m.UserID, &m.RoleID, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting membership: %w", err)
	}
	return &m, nil
}

func (r *MembershipRepo) GetByTenantAndUser(ctx context.Context, tenantID, userID uuid.UUID) (*domain.Membership, error) {
	var m domain.Membership
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, user_id, role_id, status, created_at, updated_at
		 FROM memberships WHERE tenant_id = $1 AND user_id = $2`, tenantID, userID,
	).Scan(&m.ID, &m.TenantID, &m.UserID, &m.RoleID, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting membership: %w", err)
	}
	return &m, nil
}

func (r *MembershipRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]domain.Membership, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT m.id, m.tenant_id, m.user_id, m.role_id, m.status, m.created_at, m.updated_at
		 FROM memberships m WHERE m.tenant_id = $1 ORDER BY m.created_at`, tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing memberships: %w", err)
	}
	defer rows.Close()

	var memberships []domain.Membership
	for rows.Next() {
		var m domain.Membership
		if err := rows.Scan(&m.ID, &m.TenantID, &m.UserID, &m.RoleID, &m.Status, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning membership: %w", err)
		}
		memberships = append(memberships, m)
	}
	return memberships, nil
}

func (r *MembershipRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Membership, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT m.id, m.tenant_id, m.user_id, m.role_id, m.status, m.created_at, m.updated_at
		 FROM memberships m WHERE m.user_id = $1 ORDER BY m.created_at`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing memberships by user: %w", err)
	}
	defer rows.Close()

	var memberships []domain.Membership
	for rows.Next() {
		var m domain.Membership
		if err := rows.Scan(&m.ID, &m.TenantID, &m.UserID, &m.RoleID, &m.Status, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning membership: %w", err)
		}
		memberships = append(memberships, m)
	}
	return memberships, nil
}

func (r *MembershipRepo) UpdateRole(ctx context.Context, id uuid.UUID, roleID uuid.UUID) (*domain.Membership, error) {
	var m domain.Membership
	err := r.pool.QueryRow(ctx,
		`UPDATE memberships SET role_id=$1, updated_at=now()
		 WHERE id=$2
		 RETURNING id, tenant_id, user_id, role_id, status, created_at, updated_at`,
		roleID, id,
	).Scan(&m.ID, &m.TenantID, &m.UserID, &m.RoleID, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("updating membership role: %w", err)
	}
	return &m, nil
}

func (r *MembershipRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM memberships WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting membership: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
