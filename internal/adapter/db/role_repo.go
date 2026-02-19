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

type RoleRepo struct {
	pool *pgxpool.Pool
}

func NewRoleRepo(pool *pgxpool.Pool) *RoleRepo {
	return &RoleRepo{pool: pool}
}

func (r *RoleRepo) Create(ctx context.Context, tenantID uuid.UUID, input domain.CreateRoleInput) (*domain.Role, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var role domain.Role
	err = tx.QueryRow(ctx,
		`INSERT INTO roles (tenant_id, name, description)
		 VALUES ($1, $2, $3)
		 RETURNING id, tenant_id, name, description, is_system, created_at, updated_at`,
		tenantID, input.Name, input.Description,
	).Scan(&role.ID, &role.TenantID, &role.Name, &role.Description, &role.IsSystem, &role.CreatedAt, &role.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("creating role: %w", err)
	}

	if len(input.PermissionIDs) > 0 {
		for _, pid := range input.PermissionIDs {
			_, err := tx.Exec(ctx,
				`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`,
				role.ID, pid,
			)
			if err != nil {
				return nil, fmt.Errorf("assigning permission: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("committing tx: %w", err)
	}

	perms, _ := r.GetPermissionsByRole(ctx, role.ID)
	role.Permissions = perms
	return &role, nil
}

func (r *RoleRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Role, error) {
	var role domain.Role
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, description, is_system, created_at, updated_at
		 FROM roles WHERE id = $1`, id,
	).Scan(&role.ID, &role.TenantID, &role.Name, &role.Description, &role.IsSystem, &role.CreatedAt, &role.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting role: %w", err)
	}

	perms, _ := r.GetPermissionsByRole(ctx, role.ID)
	role.Permissions = perms
	return &role, nil
}

func (r *RoleRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]domain.Role, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, tenant_id, name, description, is_system, created_at, updated_at
		 FROM roles WHERE tenant_id = $1 ORDER BY name`, tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing roles: %w", err)
	}
	defer rows.Close()

	var roles []domain.Role
	for rows.Next() {
		var role domain.Role
		if err := rows.Scan(&role.ID, &role.TenantID, &role.Name, &role.Description, &role.IsSystem, &role.CreatedAt, &role.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning role: %w", err)
		}
		perms, _ := r.GetPermissionsByRole(ctx, role.ID)
		role.Permissions = perms
		roles = append(roles, role)
	}
	return roles, nil
}

func (r *RoleRepo) Update(ctx context.Context, id uuid.UUID, input domain.UpdateRoleInput) (*domain.Role, error) {
	existing, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	name := existing.Name
	if input.Name != nil {
		name = *input.Name
	}
	description := existing.Description
	if input.Description != nil {
		description = *input.Description
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var role domain.Role
	err = tx.QueryRow(ctx,
		`UPDATE roles SET name=$1, description=$2, updated_at=now()
		 WHERE id=$3
		 RETURNING id, tenant_id, name, description, is_system, created_at, updated_at`,
		name, description, id,
	).Scan(&role.ID, &role.TenantID, &role.Name, &role.Description, &role.IsSystem, &role.CreatedAt, &role.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("updating role: %w", err)
	}

	if input.PermissionIDs != nil {
		_, err = tx.Exec(ctx, `DELETE FROM role_permissions WHERE role_id = $1`, id)
		if err != nil {
			return nil, fmt.Errorf("clearing permissions: %w", err)
		}
		for _, pid := range *input.PermissionIDs {
			_, err := tx.Exec(ctx,
				`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`,
				id, pid,
			)
			if err != nil {
				return nil, fmt.Errorf("assigning permission: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("committing tx: %w", err)
	}

	perms, _ := r.GetPermissionsByRole(ctx, role.ID)
	role.Permissions = perms
	return &role, nil
}

func (r *RoleRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM roles WHERE id = $1 AND is_system = false`, id)
	if err != nil {
		return fmt.Errorf("deleting role: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *RoleRepo) SetPermissions(ctx context.Context, roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `DELETE FROM role_permissions WHERE role_id = $1`, roleID)
	if err != nil {
		return fmt.Errorf("clearing permissions: %w", err)
	}

	for _, pid := range permissionIDs {
		_, err := tx.Exec(ctx,
			`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`,
			roleID, pid,
		)
		if err != nil {
			return fmt.Errorf("assigning permission: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *RoleRepo) GetPermissionsByRole(ctx context.Context, roleID uuid.UUID) ([]domain.Permission, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT p.id, p.resource, p.action, p.description, p.created_at
		 FROM permissions p
		 JOIN role_permissions rp ON rp.permission_id = p.id
		 WHERE rp.role_id = $1
		 ORDER BY p.resource, p.action`, roleID,
	)
	if err != nil {
		return nil, fmt.Errorf("getting permissions: %w", err)
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
