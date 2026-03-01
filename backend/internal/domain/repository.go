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
// Users are provisioned from Keycloak JWTs via Upsert (create-or-update on sub).
type UserRepository interface {
	Upsert(ctx context.Context, input UpsertUserInput) (*User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetBySub(ctx context.Context, sub string) (*User, error)
	Update(ctx context.Context, id uuid.UUID, input UpdateUserInput) (*User, error)
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
}

// MembershipRepository defines persistence operations for memberships.
type MembershipRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID, input CreateMembershipInput) (*Membership, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Membership, error)
	GetByTenantAndUser(ctx context.Context, tenantID, userID uuid.UUID) (*Membership, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]Membership, int, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]Membership, error)
	UpdateRole(ctx context.Context, id uuid.UUID, role string) (*Membership, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// AuditLogRepository defines persistence operations for audit logs.
type AuditLogRepository interface {
	Create(ctx context.Context, input CreateAuditLogInput) error
	ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]AuditLog, int, error)
}
