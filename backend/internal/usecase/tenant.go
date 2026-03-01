package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/auth"
	"github.com/finch-co/cashflow/internal/domain"
)

type TenantUseCase struct {
	tenants     domain.TenantRepository
	memberships domain.MembershipRepository
	audit       domain.AuditLogRepository
}

func NewTenantUseCase(
	tenants domain.TenantRepository,
	memberships domain.MembershipRepository,
	audit domain.AuditLogRepository,
) *TenantUseCase {
	return &TenantUseCase{
		tenants:     tenants,
		memberships: memberships,
		audit:       audit,
	}
}

// Create creates a new tenant and adds the calling user as tenant_admin.
func (uc *TenantUseCase) Create(ctx context.Context, input domain.CreateTenantInput) (*domain.Tenant, error) {
	// RBAC: enforce at usecase level
	if !uc.hasPermission(ctx, auth.PermTenantCreate) {
		return nil, domain.ErrForbidden
	}

	if input.Name == "" || input.Slug == "" {
		return nil, fmt.Errorf("%w: name and slug are required", domain.ErrValidation)
	}

	tenant, err := uc.tenants.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	// Auto-add the creator as tenant_admin
	userID, _ := domain.UserIDFromContext(ctx)
	if userID != uuid.Nil {
		_, _ = uc.memberships.Create(ctx, tenant.ID, domain.CreateMembershipInput{
			UserID: userID,
			Role:   "tenant_admin",
		})
	}

	sub, _ := domain.UserSubFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &tenant.ID,
		ActorSub:   sub,
		Action:     domain.AuditTenantCreated,
		EntityType: "tenant",
		EntityID:   tenant.ID.String(),
	})

	return tenant, nil
}

func (uc *TenantUseCase) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	if !uc.hasPermission(ctx, auth.PermTenantRead) {
		return nil, domain.ErrForbidden
	}
	return uc.tenants.GetByID(ctx, id)
}

func (uc *TenantUseCase) List(ctx context.Context, limit, offset int) ([]domain.Tenant, int, error) {
	if !uc.hasPermission(ctx, auth.PermTenantRead) {
		return nil, 0, domain.ErrForbidden
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return uc.tenants.List(ctx, limit, offset)
}

func (uc *TenantUseCase) Update(ctx context.Context, id uuid.UUID, input domain.UpdateTenantInput) (*domain.Tenant, error) {
	if !uc.hasPermission(ctx, auth.PermTenantUpdate) {
		return nil, domain.ErrForbidden
	}

	tenant, err := uc.tenants.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	sub, _ := domain.UserSubFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &id,
		ActorSub:   sub,
		Action:     domain.AuditTenantUpdated,
		EntityType: "tenant",
		EntityID:   id.String(),
	})

	return tenant, nil
}

func (uc *TenantUseCase) Delete(ctx context.Context, id uuid.UUID) error {
	if !uc.hasPermission(ctx, auth.PermTenantDelete) {
		return domain.ErrForbidden
	}

	if err := uc.tenants.Delete(ctx, id); err != nil {
		return err
	}

	sub, _ := domain.UserSubFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &id,
		ActorSub:   sub,
		Action:     domain.AuditTenantDeleted,
		EntityType: "tenant",
		EntityID:   id.String(),
	})

	return nil
}

// hasPermission resolves permissions from Keycloak client roles in context.
func (uc *TenantUseCase) hasPermission(ctx context.Context, perm auth.Permission) bool {
	roles := domain.ClientRolesFromContext(ctx)
	perms := auth.ResolvePermissions(roles)
	return auth.HasPermission(perms, perm)
}
