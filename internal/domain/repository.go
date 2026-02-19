package domain

import (
	"context"

	"github.com/google/uuid"
)

// TenantRepository defines persistence operations for tenants.
type TenantRepository interface {
	Create(ctx context.Context, input CreateTenantInput) (*Tenant, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Tenant, error)
	GetBySlug(ctx context.Context, slug string) (*Tenant, error)
	List(ctx context.Context, limit, offset int) ([]Tenant, int, error)
	Update(ctx context.Context, id uuid.UUID, input UpdateTenantInput) (*Tenant, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// UserRepository defines persistence operations for users.
type UserRepository interface {
	Create(ctx context.Context, input CreateUserInput, passwordHash string) (*User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByIDPSubject(ctx context.Context, issuer, subject string) (*User, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]User, int, error)
	Update(ctx context.Context, id uuid.UUID, input UpdateUserInput) (*User, error)
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// RoleRepository defines persistence operations for roles.
type RoleRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID, input CreateRoleInput) (*Role, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Role, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Role, error)
	Update(ctx context.Context, id uuid.UUID, input UpdateRoleInput) (*Role, error)
	Delete(ctx context.Context, id uuid.UUID) error
	SetPermissions(ctx context.Context, roleID uuid.UUID, permissionIDs []uuid.UUID) error
	GetPermissionsByRole(ctx context.Context, roleID uuid.UUID) ([]Permission, error)
}

// PermissionRepository defines persistence operations for permissions.
type PermissionRepository interface {
	List(ctx context.Context) ([]Permission, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Permission, error)
}

// MembershipRepository defines persistence operations for memberships.
type MembershipRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID, input CreateMembershipInput) (*Membership, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Membership, error)
	GetByTenantAndUser(ctx context.Context, tenantID, userID uuid.UUID) (*Membership, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Membership, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]Membership, error)
	UpdateRole(ctx context.Context, id uuid.UUID, roleID uuid.UUID) (*Membership, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// AuditLogRepository defines persistence operations for audit logs.
type AuditLogRepository interface {
	Create(ctx context.Context, input CreateAuditLogInput) error
	ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]AuditLog, int, error)
}
