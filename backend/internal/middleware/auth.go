package middleware

import (
"github.com/finch-co/cashflow/internal/models"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/auth"
)

// KeycloakAuth validates Keycloak-issued JWTs (RS256 via JWKS) and populates
// context with user subject, email, tenant_id, and client roles.
func KeycloakAuth(validator *auth.Validator, audit models.AuditLogRepository) func(http.Handler) http.Handler {
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
				_ = audit.Create(r.Context(), models.CreateAuditLogInput{
					Action:    models.AuditTokenInvalid,
					IPAddress: r.RemoteAddr,
					UserAgent: r.UserAgent(),
					Metadata:  map[string]any{"error": err.Error()},
				})
				writeError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			ctx := r.Context()

			// Set Keycloak subject
			ctx = models.ContextWithUserSub(ctx, claims.Subject)

			// Set email
			if claims.Email != "" {
				ctx = models.ContextWithUserEmail(ctx, claims.Email)
			}

			// Set tenant_id from custom claim
			if claims.TenantID != "" {
				if tid, err := uuid.Parse(claims.TenantID); err == nil {
					ctx = models.ContextWithTenantID(ctx, tid)
				}
			}

			// Set client roles
			ctx = models.ContextWithClientRoles(ctx, claims.ClientRoles)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// TenantFromHeader extracts X-Tenant-ID header and sets it in context.
// JWT tenant_id claim takes precedence if already set.
func TenantFromHeader(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		if _, ok := models.TenantIDFromContext(ctx); !ok {
			if tenantHeader := r.Header.Get("X-Tenant-ID"); tenantHeader != "" {
				if tid, err := uuid.Parse(tenantHeader); err == nil {
					ctx = models.ContextWithTenantID(ctx, tid)
				}
			}
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireTenant ensures tenant_id is present in context.
func RequireTenant(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := models.TenantIDFromContext(r.Context()); !ok {
			writeError(w, http.StatusForbidden, "tenant context required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// TenantFromRouteParam extracts tenant UUID from a route param (e.g. {tenantID})
// and stores it in context. If a tenant_id already exists in context and it does
// not match the route tenant ID, the request is rejected.
func TenantFromRouteParam(param string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantParam := chi.URLParam(r, param)
			if tenantParam == "" {
				writeError(w, http.StatusForbidden, "tenant id is required in route")
				return
			}

			routeTenantID, err := uuid.Parse(tenantParam)
			if err != nil {
				writeError(w, http.StatusBadRequest, "invalid tenant id in route")
				return
			}

			ctx := r.Context()
			if existingTenantID, ok := models.TenantIDFromContext(ctx); ok && existingTenantID != routeTenantID {
				writeError(w, http.StatusForbidden, "tenant mismatch")
				return
			}

			ctx = models.ContextWithTenantID(ctx, routeTenantID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireTenantMembership ensures the authenticated user belongs to the tenant in context.
func RequireTenantMembership(memberships models.MembershipRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			tenantID, ok := models.TenantIDFromContext(ctx)
			if !ok {
				writeError(w, http.StatusForbidden, "tenant context required")
				return
			}

			userID, ok := models.UserIDFromContext(ctx)
			if !ok {
				writeError(w, http.StatusUnauthorized, "user context required")
				return
			}

			if _, err := memberships.GetByTenantAndUser(ctx, tenantID, userID); err != nil {
				if err == models.ErrNotFound {
					writeError(w, http.StatusForbidden, "user is not a member of this tenant")
					return
				}
				log.Error().
					Err(err).
					Str("tenant_id", tenantID.String()).
					Str("user_id", userID.String()).
					Msg("failed to validate tenant membership")
				writeError(w, http.StatusInternalServerError, "failed to validate tenant membership")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequirePermission checks that the authenticated user's Keycloak roles
// grant the required permission, using the permission matrix in auth.RolePermissions.
func RequirePermission(perm auth.Permission) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			roles := models.ClientRolesFromContext(r.Context())
			perms := auth.ResolvePermissions(roles)
			if !auth.HasPermission(perms, perm) {
				sub, _ := models.UserSubFromContext(r.Context())
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
func ProvisionUser(users models.UserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			sub, ok := models.UserSubFromContext(ctx)
			if !ok {
				next.ServeHTTP(w, r)
				return
			}

			email, _ := models.UserEmailFromContext(ctx)

			// Upsert: create or update the user from Keycloak claims
			user, err := users.Upsert(ctx, models.UpsertUserInput{
				Sub:   sub,
				Email: email,
			})
			if err != nil {
				log.Error().Err(err).Str("sub", sub).Msg("failed to provision user")
				writeError(w, http.StatusInternalServerError, "user provisioning failed")
				return
			}

			// Set internal user ID in context
			ctx = models.ContextWithUserID(ctx, user.ID)
			_ = users.UpdateLastLogin(ctx, user.ID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
