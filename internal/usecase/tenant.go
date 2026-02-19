package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
)

type TenantUseCase struct {
	tenants     domain.TenantRepository
	roles       domain.RoleRepository
	permissions domain.PermissionRepository
	audit       domain.AuditLogRepository
}

func NewTenantUseCase(
	tenants domain.TenantRepository,
	roles domain.RoleRepository,
	permissions domain.PermissionRepository,
	audit domain.AuditLogRepository,
) *TenantUseCase {
	return &TenantUseCase{
		tenants:     tenants,
		roles:       roles,
		permissions: permissions,
		audit:       audit,
	}
}

func (uc *TenantUseCase) Create(ctx context.Context, input domain.CreateTenantInput) (*domain.Tenant, error) {
	if input.Name == "" || input.Slug == "" {
		return nil, fmt.Errorf("%w: name and slug are required", domain.ErrValidation)
	}

	tenant, err := uc.tenants.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	// Create default system roles: admin and member
	allPerms, _ := uc.permissions.List(ctx)
	var allPermIDs []uuid.UUID
	for _, p := range allPerms {
		allPermIDs = append(allPermIDs, p.ID)
	}

	// Admin role gets all permissions
	_, err = uc.roles.Create(ctx, tenant.ID, domain.CreateRoleInput{
		Name:          "admin",
		Description:   "Tenant administrator with full access",
		PermissionIDs: allPermIDs,
	})
	if err != nil {
		return nil, fmt.Errorf("creating admin role: %w", err)
	}

	// Member role gets read-only permissions
	var readPermIDs []uuid.UUID
	for _, p := range allPerms {
		if p.Action == "read" {
			readPermIDs = append(readPermIDs, p.ID)
		}
	}
	_, err = uc.roles.Create(ctx, tenant.ID, domain.CreateRoleInput{
		Name:          "member",
		Description:   "Regular member with read access",
		PermissionIDs: readPermIDs,
	})
	if err != nil {
		return nil, fmt.Errorf("creating member role: %w", err)
	}

	// Audit log
	actorID, _ := domain.UserIDFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &tenant.ID,
		ActorID:    &actorID,
		Action:     "tenant.create",
		EntityType: "tenant",
		EntityID:   tenant.ID.String(),
	})

	return tenant, nil
}

func (uc *TenantUseCase) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	return uc.tenants.GetByID(ctx, id)
}

func (uc *TenantUseCase) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	return uc.tenants.GetBySlug(ctx, slug)
}

func (uc *TenantUseCase) List(ctx context.Context, limit, offset int) ([]domain.Tenant, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return uc.tenants.List(ctx, limit, offset)
}

func (uc *TenantUseCase) Update(ctx context.Context, id uuid.UUID, input domain.UpdateTenantInput) (*domain.Tenant, error) {
	tenant, err := uc.tenants.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	actorID, _ := domain.UserIDFromContext(ctx)
	tenantID, _ := domain.TenantIDFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &tenantID,
		ActorID:    &actorID,
		Action:     "tenant.update",
		EntityType: "tenant",
		EntityID:   id.String(),
	})

	return tenant, nil
}

func (uc *TenantUseCase) Delete(ctx context.Context, id uuid.UUID) error {
	if err := uc.tenants.Delete(ctx, id); err != nil {
		return err
	}

	actorID, _ := domain.UserIDFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &id,
		ActorID:    &actorID,
		Action:     "tenant.delete",
		EntityType: "tenant",
		EntityID:   id.String(),
	})

	return nil
}
