package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
)

type UserUseCase struct {
	users       domain.UserRepository
	memberships domain.MembershipRepository
	roles       domain.RoleRepository
	audit       domain.AuditLogRepository
}

func NewUserUseCase(
	users domain.UserRepository,
	memberships domain.MembershipRepository,
	roles domain.RoleRepository,
	audit domain.AuditLogRepository,
) *UserUseCase {
	return &UserUseCase{
		users:       users,
		memberships: memberships,
		roles:       roles,
		audit:       audit,
	}
}

func (uc *UserUseCase) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return uc.users.GetByID(ctx, id)
}

func (uc *UserUseCase) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.User, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return uc.users.ListByTenant(ctx, tenantID, limit, offset)
}

func (uc *UserUseCase) Update(ctx context.Context, id uuid.UUID, input domain.UpdateUserInput) (*domain.User, error) {
	user, err := uc.users.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	actorID, _ := domain.UserIDFromContext(ctx)
	tenantID, _ := domain.TenantIDFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &tenantID,
		ActorID:    &actorID,
		Action:     "user.update",
		EntityType: "user",
		EntityID:   id.String(),
	})

	return user, nil
}

func (uc *UserUseCase) Delete(ctx context.Context, id uuid.UUID) error {
	if err := uc.users.Delete(ctx, id); err != nil {
		return err
	}

	actorID, _ := domain.UserIDFromContext(ctx)
	tenantID, _ := domain.TenantIDFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &tenantID,
		ActorID:    &actorID,
		Action:     "user.delete",
		EntityType: "user",
		EntityID:   id.String(),
	})

	return nil
}

// GetProfile returns the current authenticated user's profile.
func (uc *UserUseCase) GetProfile(ctx context.Context) (*domain.User, error) {
	userID, ok := domain.UserIDFromContext(ctx)
	if !ok {
		return nil, domain.ErrUnauthorized
	}
	return uc.users.GetByID(ctx, userID)
}

// AddMember adds a user to a tenant with a given role.
func (uc *UserUseCase) AddMember(ctx context.Context, tenantID uuid.UUID, input domain.CreateMembershipInput) (*domain.Membership, error) {
	// Verify user and role exist
	if _, err := uc.users.GetByID(ctx, input.UserID); err != nil {
		return nil, fmt.Errorf("user: %w", err)
	}
	if _, err := uc.roles.GetByID(ctx, input.RoleID); err != nil {
		return nil, fmt.Errorf("role: %w", err)
	}

	membership, err := uc.memberships.Create(ctx, tenantID, input)
	if err != nil {
		return nil, err
	}

	actorID, _ := domain.UserIDFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &tenantID,
		ActorID:    &actorID,
		Action:     "membership.create",
		EntityType: "membership",
		EntityID:   membership.ID.String(),
		Metadata:   map[string]any{"user_id": input.UserID.String(), "role_id": input.RoleID.String()},
	})

	return membership, nil
}

// ChangeMemberRole updates a membership's role.
func (uc *UserUseCase) ChangeMemberRole(ctx context.Context, membershipID, roleID uuid.UUID) (*domain.Membership, error) {
	membership, err := uc.memberships.UpdateRole(ctx, membershipID, roleID)
	if err != nil {
		return nil, err
	}

	actorID, _ := domain.UserIDFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &membership.TenantID,
		ActorID:    &actorID,
		Action:     "membership.role_change",
		EntityType: "membership",
		EntityID:   membershipID.String(),
		Metadata:   map[string]any{"new_role_id": roleID.String()},
	})

	return membership, nil
}

// RemoveMember removes a user from a tenant.
func (uc *UserUseCase) RemoveMember(ctx context.Context, membershipID uuid.UUID) error {
	membership, err := uc.memberships.GetByID(ctx, membershipID)
	if err != nil {
		return err
	}

	if err := uc.memberships.Delete(ctx, membershipID); err != nil {
		return err
	}

	actorID, _ := domain.UserIDFromContext(ctx)
	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &membership.TenantID,
		ActorID:    &actorID,
		Action:     "membership.delete",
		EntityType: "membership",
		EntityID:   membershipID.String(),
	})

	return nil
}
