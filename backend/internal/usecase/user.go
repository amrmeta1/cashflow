package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/auth"
	"github.com/finch-co/cashflow/internal/domain"
)

type MemberUseCase struct {
	users       domain.UserRepository
	memberships domain.MembershipRepository
	audit       domain.AuditLogRepository
}

func NewMemberUseCase(
	users domain.UserRepository,
	memberships domain.MembershipRepository,
	audit domain.AuditLogRepository,
) *MemberUseCase {
	return &MemberUseCase{
		users:       users,
		memberships: memberships,
		audit:       audit,
	}
}

// GetProfile returns the current authenticated user's profile.
func (uc *MemberUseCase) GetProfile(ctx context.Context) (*domain.User, error) {
	userID, ok := domain.UserIDFromContext(ctx)
	if !ok {
		return nil, domain.ErrUnauthorized
	}
	return uc.users.GetByID(ctx, userID)
}

// AddMember adds a user to a tenant with a given role.
func (uc *MemberUseCase) AddMember(ctx context.Context, tenantID uuid.UUID, input domain.CreateMembershipInput) (*domain.Membership, error) {
	if !uc.hasPermission(ctx, auth.PermMemberAdd) {
		return nil, domain.ErrForbidden
	}

	if !domain.IsValidRole(input.Role) {
		return nil, fmt.Errorf("%w: invalid role %q", domain.ErrValidation, input.Role)
	}

	// Verify the target user exists
	if _, err := uc.users.GetByID(ctx, input.UserID); err != nil {
		return nil, fmt.Errorf("user: %w", err)
	}

	membership, err := uc.memberships.Create(ctx, tenantID, input)
	if err != nil {
		return nil, err
	}

	sub, _ := domain.UserSubFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &tenantID,
		ActorSub:   sub,
		Action:     domain.AuditMemberAdded,
		EntityType: "membership",
		EntityID:   membership.ID.String(),
		Metadata:   map[string]any{"user_id": input.UserID.String(), "role": input.Role},
	})

	return membership, nil
}

// ListMembers lists all members of a tenant.
func (uc *MemberUseCase) ListMembers(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.Membership, int, error) {
	if !uc.hasPermission(ctx, auth.PermMemberRead) {
		return nil, 0, domain.ErrForbidden
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return uc.memberships.ListByTenant(ctx, tenantID, limit, offset)
}

// ChangeMemberRole updates a membership's role.
func (uc *MemberUseCase) ChangeMemberRole(ctx context.Context, membershipID uuid.UUID, role string) (*domain.Membership, error) {
	if !uc.hasPermission(ctx, auth.PermMemberRoleChange) {
		return nil, domain.ErrForbidden
	}

	if !domain.IsValidRole(role) {
		return nil, fmt.Errorf("%w: invalid role %q", domain.ErrValidation, role)
	}

	membership, err := uc.memberships.UpdateRole(ctx, membershipID, role)
	if err != nil {
		return nil, err
	}

	sub, _ := domain.UserSubFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &membership.TenantID,
		ActorSub:   sub,
		Action:     domain.AuditRoleChanged,
		EntityType: "membership",
		EntityID:   membershipID.String(),
		Metadata:   map[string]any{"new_role": role},
	})

	return membership, nil
}

// RemoveMember removes a user from a tenant.
func (uc *MemberUseCase) RemoveMember(ctx context.Context, membershipID uuid.UUID) error {
	if !uc.hasPermission(ctx, auth.PermMemberRemove) {
		return domain.ErrForbidden
	}

	membership, err := uc.memberships.GetByID(ctx, membershipID)
	if err != nil {
		return err
	}

	if err := uc.memberships.Delete(ctx, membershipID); err != nil {
		return err
	}

	sub, _ := domain.UserSubFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &membership.TenantID,
		ActorSub:   sub,
		Action:     domain.AuditMemberRemoved,
		EntityType: "membership",
		EntityID:   membershipID.String(),
	})

	return nil
}

func (uc *MemberUseCase) hasPermission(ctx context.Context, perm auth.Permission) bool {
	roles := domain.ClientRolesFromContext(ctx)
	perms := auth.ResolvePermissions(roles)
	return auth.HasPermission(perms, perm)
}
