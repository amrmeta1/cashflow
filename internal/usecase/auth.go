package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/finch-co/cashflow/internal/config"
	"github.com/finch-co/cashflow/internal/domain"
)

type AuthUseCase struct {
	users       domain.UserRepository
	memberships domain.MembershipRepository
	roles       domain.RoleRepository
	audit       domain.AuditLogRepository
	cfg         config.AuthConfig
}

func NewAuthUseCase(
	users domain.UserRepository,
	memberships domain.MembershipRepository,
	roles domain.RoleRepository,
	audit domain.AuditLogRepository,
	cfg config.AuthConfig,
) *AuthUseCase {
	return &AuthUseCase{
		users:       users,
		memberships: memberships,
		roles:       roles,
		audit:       audit,
		cfg:         cfg,
	}
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	TenantID string `json:"tenant_id"`
}

type RegisterInput struct {
	Email    string    `json:"email"`
	Password string    `json:"password"`
	FullName string    `json:"full_name"`
	TenantID uuid.UUID `json:"tenant_id"`
}

// Login authenticates a user with email/password (local auth) and returns JWT tokens.
func (uc *AuthUseCase) Login(ctx context.Context, input LoginInput, ipAddress, userAgent string) (*TokenPair, error) {
	user, err := uc.users.GetByEmail(ctx, input.Email)
	if err != nil {
		_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
			Action:     "user.login_failed",
			EntityType: "user",
			Metadata:   map[string]any{"email": input.Email, "reason": "user_not_found"},
			IPAddress:  ipAddress,
			UserAgent:  userAgent,
		})
		return nil, domain.ErrInvalidCredentials
	}

	if user.PasswordHash == "" {
		return nil, fmt.Errorf("%w: user has no local password (use OIDC)", domain.ErrInvalidCredentials)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
			ActorID:    &user.ID,
			Action:     "user.login_failed",
			EntityType: "user",
			EntityID:   user.ID.String(),
			Metadata:   map[string]any{"reason": "invalid_password"},
			IPAddress:  ipAddress,
			UserAgent:  userAgent,
		})
		return nil, domain.ErrInvalidCredentials
	}

	// Resolve tenant membership
	var tenantID uuid.UUID
	if input.TenantID != "" {
		tid, err := uuid.Parse(input.TenantID)
		if err != nil {
			return nil, fmt.Errorf("%w: invalid tenant_id", domain.ErrValidation)
		}
		tenantID = tid
	} else {
		// Use first membership
		memberships, err := uc.memberships.ListByUser(ctx, user.ID)
		if err != nil || len(memberships) == 0 {
			return nil, fmt.Errorf("%w: user has no tenant membership", domain.ErrForbidden)
		}
		tenantID = memberships[0].TenantID
	}

	membership, err := uc.memberships.GetByTenantAndUser(ctx, tenantID, user.ID)
	if err != nil {
		return nil, fmt.Errorf("%w: no membership in tenant", domain.ErrForbidden)
	}

	perms, _ := uc.roles.GetPermissionsByRole(ctx, membership.RoleID)

	_ = uc.users.UpdateLastLogin(ctx, user.ID)

	tokens, err := uc.generateTokenPair(user, tenantID, membership.RoleID, perms)
	if err != nil {
		return nil, err
	}

	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		TenantID:   &tenantID,
		ActorID:    &user.ID,
		Action:     "user.login",
		EntityType: "user",
		EntityID:   user.ID.String(),
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
	})

	return tokens, nil
}

// Register creates a new user with local auth credentials.
func (uc *AuthUseCase) Register(ctx context.Context, input RegisterInput, ipAddress, userAgent string) (*domain.User, error) {
	if input.Email == "" || input.Password == "" || input.FullName == "" {
		return nil, fmt.Errorf("%w: email, password, and full_name are required", domain.ErrValidation)
	}

	if len(input.Password) < 8 {
		return nil, fmt.Errorf("%w: password must be at least 8 characters", domain.ErrValidation)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hashing password: %w", err)
	}

	user, err := uc.users.Create(ctx, domain.CreateUserInput{
		Email:    input.Email,
		FullName: input.FullName,
	}, string(hash))
	if err != nil {
		return nil, err
	}

	// If tenant specified, find member role and create membership
	if input.TenantID != uuid.Nil {
		roles, _ := uc.roles.ListByTenant(ctx, input.TenantID)
		var memberRoleID uuid.UUID
		for _, r := range roles {
			if r.Name == "member" {
				memberRoleID = r.ID
				break
			}
		}
		if memberRoleID != uuid.Nil {
			_, _ = uc.memberships.Create(ctx, input.TenantID, domain.CreateMembershipInput{
				UserID: user.ID,
				RoleID: memberRoleID,
			})
		}
	}

	_ = uc.audit.Create(ctx, domain.CreateAuditLogInput{
		ActorID:    &user.ID,
		Action:     "user.register",
		EntityType: "user",
		EntityID:   user.ID.String(),
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
	})

	return user, nil
}

func (uc *AuthUseCase) generateTokenPair(user *domain.User, tenantID, roleID uuid.UUID, perms []domain.Permission) (*TokenPair, error) {
	now := time.Now()

	var permStrings []string
	for _, p := range perms {
		permStrings = append(permStrings, p.Resource+":"+p.Action)
	}

	accessClaims := jwt.MapClaims{
		"sub":         user.ID.String(),
		"email":       user.Email,
		"tenant_id":   tenantID.String(),
		"role_id":     roleID.String(),
		"permissions": permStrings,
		"iat":         now.Unix(),
		"exp":         now.Add(time.Duration(uc.cfg.AccessTokenTTL) * time.Second).Unix(),
		"iss":         "cashflow-tenant-service",
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessStr, err := accessToken.SignedString([]byte(uc.cfg.JWTSecret))
	if err != nil {
		return nil, fmt.Errorf("signing access token: %w", err)
	}

	refreshClaims := jwt.MapClaims{
		"sub":       user.ID.String(),
		"tenant_id": tenantID.String(),
		"type":      "refresh",
		"iat":       now.Unix(),
		"exp":       now.Add(time.Duration(uc.cfg.RefreshTokenTTL) * time.Second).Unix(),
		"iss":       "cashflow-tenant-service",
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshStr, err := refreshToken.SignedString([]byte(uc.cfg.JWTSecret))
	if err != nil {
		return nil, fmt.Errorf("signing refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessStr,
		RefreshToken: refreshStr,
		ExpiresIn:    uc.cfg.AccessTokenTTL,
		TokenType:    "Bearer",
	}, nil
}
