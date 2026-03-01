package middleware

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/auth"
	"github.com/finch-co/cashflow/internal/domain"
)

// KeycloakAuth validates Keycloak-issued JWTs (RS256 via JWKS) and populates
// context with user subject, email, tenant_id, and client roles.
func KeycloakAuth(validator *auth.Validator, audit domain.AuditLogRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				writeError(w, http.StatusUnauthorized, "invalid authorization header format")
				return
			}

			claims, err := validator.Validate(r.Context(), parts[1])
			if err != nil {
				log.Warn().Err(err).Str("ip", r.RemoteAddr).Msg("token validation failed")
				// Audit: token_invalid
				_ = audit.Create(r.Context(), domain.CreateAuditLogInput{
					Action:    domain.AuditTokenInvalid,
					IPAddress: r.RemoteAddr,
					UserAgent: r.UserAgent(),
					Metadata:  map[string]any{"error": err.Error()},
				})
				writeError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			ctx := r.Context()

			// Set Keycloak subject
			ctx = domain.ContextWithUserSub(ctx, claims.Subject)

			// Set email
			if claims.Email != "" {
				ctx = domain.ContextWithUserEmail(ctx, claims.Email)
			}

			// Set tenant_id from custom claim
			if claims.TenantID != "" {
				if tid, err := uuid.Parse(claims.TenantID); err == nil {
					ctx = domain.ContextWithTenantID(ctx, tid)
				}
			}

			// Set client roles
			ctx = domain.ContextWithClientRoles(ctx, claims.ClientRoles)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// TenantFromHeader extracts X-Tenant-ID header and sets it in context.
// JWT tenant_id claim takes precedence if already set.
func TenantFromHeader(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		if _, ok := domain.TenantIDFromContext(ctx); !ok {
			if tenantHeader := r.Header.Get("X-Tenant-ID"); tenantHeader != "" {
				if tid, err := uuid.Parse(tenantHeader); err == nil {
					ctx = domain.ContextWithTenantID(ctx, tid)
				}
			}
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireTenant ensures tenant_id is present in context.
func RequireTenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := domain.TenantIDFromContext(r.Context()); !ok {
			writeError(w, http.StatusForbidden, "tenant context required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequirePermission checks that the authenticated user's Keycloak roles
// grant the required permission, using the permission matrix in auth.RolePermissions.
func RequirePermission(perm auth.Permission) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			roles := domain.ClientRolesFromContext(r.Context())
			perms := auth.ResolvePermissions(roles)
			if !auth.HasPermission(perms, perm) {
				sub, _ := domain.UserSubFromContext(r.Context())
				log.Warn().
					Str("sub", sub).
					Str("permission", string(perm)).
					Msg("access denied: insufficient permissions")
				writeError(w, http.StatusForbidden, "insufficient permissions")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ProvisionUser upserts the user record from JWT claims on every authenticated request.
// This ensures users are automatically provisioned in the local DB when they
// first authenticate via Keycloak.
func ProvisionUser(users domain.UserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			sub, ok := domain.UserSubFromContext(ctx)
			if !ok {
				next.ServeHTTP(w, r)
				return
			}

			email, _ := domain.UserEmailFromContext(ctx)

			// Upsert: create or update the user from Keycloak claims
			user, err := users.Upsert(ctx, domain.UpsertUserInput{
				Sub:   sub,
				Email: email,
			})
			if err != nil {
				log.Error().Err(err).Str("sub", sub).Msg("failed to provision user")
				writeError(w, http.StatusInternalServerError, "user provisioning failed")
				return
			}

			// Set internal user ID in context
			ctx = domain.ContextWithUserID(ctx, user.ID)
			_ = users.UpdateLastLogin(ctx, user.ID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
