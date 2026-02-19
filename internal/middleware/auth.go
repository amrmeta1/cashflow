package middleware

import (
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/domain"
)

// JWTAuth validates Bearer tokens and populates context with user/tenant/permissions.
// Supports both local JWT (HS256) and external OIDC tokens.
func JWTAuth(jwtSecret string) func(http.Handler) http.Handler {
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
			tokenStr := parts[1]

			token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				log.Warn().Err(err).Str("ip", r.RemoteAddr).Msg("token validation failed")
				writeError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				writeError(w, http.StatusUnauthorized, "invalid token claims")
				return
			}

			ctx := r.Context()

			// Extract user ID
			if sub, ok := claims["sub"].(string); ok {
				if uid, err := uuid.Parse(sub); err == nil {
					ctx = domain.ContextWithUserID(ctx, uid)
				}
			}

			// Extract email
			if email, ok := claims["email"].(string); ok {
				ctx = domain.ContextWithUserEmail(ctx, email)
			}

			// Extract tenant ID
			if tid, ok := claims["tenant_id"].(string); ok {
				if tenantID, err := uuid.Parse(tid); err == nil {
					ctx = domain.ContextWithTenantID(ctx, tenantID)
				}
			}

			// Extract permissions
			if permsRaw, ok := claims["permissions"].([]any); ok {
				var perms []domain.Permission
				for _, p := range permsRaw {
					if ps, ok := p.(string); ok {
						parts := strings.SplitN(ps, ":", 2)
						if len(parts) == 2 {
							perms = append(perms, domain.Permission{
								Resource: parts[0],
								Action:   parts[1],
							})
						}
					}
				}
				ctx = domain.ContextWithPermissions(ctx, perms)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuth tries to parse the token but does not reject unauthenticated requests.
func OptionalAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Delegate to full auth
			JWTAuth(jwtSecret)(next).ServeHTTP(w, r)
		})
	}
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

// TenantFromHeader extracts X-Tenant-ID header and sets it in context.
// This is used for API gateway scenarios where the gateway resolves the tenant.
func TenantFromHeader(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Only set if not already in context (JWT takes precedence)
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

// RequirePermission checks that the current user has a specific permission.
func RequirePermission(resource, action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !domain.HasPermission(r.Context(), resource, action) {
				writeError(w, http.StatusForbidden, "insufficient permissions")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

