package enterprise

import (
"github.com/finch-co/cashflow/internal/models"
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/auth"
)

type TenantUseCase struct {
	tenants     models.TenantRepository
	memberships models.MembershipRepository
	audit       models.AuditLogRepository
}

func NewTenantUseCase(
	tenants models.TenantRepository,
	memberships models.MembershipRepository,
	audit models.AuditLogRepository,
) *TenantUseCase {
	return &TenantUseCase{
		tenants:     tenants,
		memberships: memberships,
		audit:       audit,
	}
}

// Create creates a new tenant and adds the calling user as tenant_admin.
func (uc *TenantUseCase) Create(ctx context.Context, input models.CreateTenantInput) (*models.Tenant, error) {
	// RBAC: enforce at usecase level
	if !uc.hasPermission(ctx, auth.PermTenantCreate) {
		return nil, models.ErrForbidden
	}

	if input.Name == "" || input.Slug == "" {
		return nil, fmt.Errorf("%w: name and slug are required", models.ErrValidation)
	}

	tenant, err := uc.tenants.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	// Auto-add the creator as tenant_admin
	userID, _ := models.UserIDFromContext(ctx)
	if userID != uuid.Nil {
		_, _ = uc.memberships.Create(ctx, tenant.ID, models.CreateMembershipInput{
			UserID: userID,
			Role:   "tenant_admin",
		})
	}

	sub, _ := models.UserSubFromContext(ctx)
	_ = uc.audit.Create(ctx, models.CreateAuditLogInput{
		TenantID:   &tenant.ID,
		ActorSub:   sub,
		Action:     models.AuditTenantCreated,
		EntityType: "tenant",
		EntityID:   tenant.ID.String(),
	})

	return tenant, nil
}

func (uc *TenantUseCase) GetByID(ctx context.Context, id uuid.UUID) (*models.Tenant, error) {
	if !uc.hasPermission(ctx, auth.PermTenantRead) {
		return nil, models.ErrForbidden
	}
	return uc.tenants.GetByID(ctx, id)
}

func (uc *TenantUseCase) List(ctx context.Context, limit, offset int) ([]models.Tenant, int, error) {
	if !uc.hasPermission(ctx, auth.PermTenantRead) {
		return nil, 0, models.ErrForbidden
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return uc.tenants.List(ctx, limit, offset)
}

func (uc *TenantUseCase) Update(ctx context.Context, id uuid.UUID, input models.UpdateTenantInput) (*models.Tenant, error) {
	if !uc.hasPermission(ctx, auth.PermTenantUpdate) {
		return nil, models.ErrForbidden
	}

	tenant, err := uc.tenants.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	sub, _ := models.UserSubFromContext(ctx)
	_ = uc.audit.Create(ctx, models.CreateAuditLogInput{
		TenantID:   &id,
		ActorSub:   sub,
		Action:     models.AuditTenantUpdated,
		EntityType: "tenant",
		EntityID:   id.String(),
	})

	return tenant, nil
}

func (uc *TenantUseCase) Delete(ctx context.Context, id uuid.UUID) error {
	if !uc.hasPermission(ctx, auth.PermTenantDelete) {
		return models.ErrForbidden
	}

	if err := uc.tenants.Delete(ctx, id); err != nil {
		return err
	}

	sub, _ := models.UserSubFromContext(ctx)
	_ = uc.audit.Create(ctx, models.CreateAuditLogInput{
		TenantID:   &id,
		ActorSub:   sub,
		Action:     models.AuditTenantDeleted,
		EntityType: "tenant",
		EntityID:   id.String(),
	})

	return nil
}

// hasPermission resolves permissions from Keycloak client roles in context.
func (uc *TenantUseCase) hasPermission(ctx context.Context, perm auth.Permission) bool {
	roles := models.ClientRolesFromContext(ctx)
	perms := auth.ResolvePermissions(roles)
	return auth.HasPermission(perms, perm)
}
