package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/finch-co/cashflow/internal/middleware"
)

type RouterDeps struct {
	JWTSecret   string
	Tenants     *TenantHandler
	Auth        *AuthHandler
	Users       *UserHandler
	Roles       *RoleHandler
	Audit       *AuditHandler
}

func NewRouter(deps RouterDeps) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.RequestLogging)
	r.Use(chimw.Recoverer)
	r.Use(chimw.AllowContentType("application/json"))
	r.Use(corsMiddleware)

	// Health check (unauthenticated)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth endpoints (unauthenticated)
	r.Route("/api/v1/auth", func(r chi.Router) {
		r.Post("/login", deps.Auth.Login)
		r.Post("/register", deps.Auth.Register)
	})

	// Authenticated routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.JWTAuth(deps.JWTSecret))
		r.Use(middleware.TenantFromHeader)

		// Current user profile
		r.Get("/api/v1/me", deps.Users.GetProfile)

		// Tenant management (requires tenant.* permissions)
		r.Route("/api/v1/tenants", func(r chi.Router) {
			r.With(middleware.RequirePermission("tenant", "create")).Post("/", deps.Tenants.Create)
			r.With(middleware.RequirePermission("tenant", "read")).Get("/", deps.Tenants.List)

			r.Route("/{tenantID}", func(r chi.Router) {
				r.With(middleware.RequirePermission("tenant", "read")).Get("/", deps.Tenants.GetByID)
				r.With(middleware.RequirePermission("tenant", "update")).Put("/", deps.Tenants.Update)
				r.With(middleware.RequirePermission("tenant", "delete")).Delete("/", deps.Tenants.Delete)
			})
		})

		// User management (within tenant context)
		r.Route("/api/v1/users", func(r chi.Router) {
			r.Use(middleware.RequireTenant)
			r.With(middleware.RequirePermission("user", "read")).Get("/", deps.Users.ListByTenant)

			r.Route("/{userID}", func(r chi.Router) {
				r.With(middleware.RequirePermission("user", "read")).Get("/", deps.Users.GetByID)
				r.With(middleware.RequirePermission("user", "update")).Put("/", deps.Users.Update)
				r.With(middleware.RequirePermission("user", "delete")).Delete("/", deps.Users.Delete)
			})
		})

		// Membership management
		r.Route("/api/v1/memberships", func(r chi.Router) {
			r.Use(middleware.RequireTenant)
			r.With(middleware.RequirePermission("membership", "manage")).Post("/", deps.Users.AddMember)

			r.Route("/{membershipID}", func(r chi.Router) {
				r.With(middleware.RequirePermission("membership", "manage")).Put("/role", deps.Users.ChangeMemberRole)
				r.With(middleware.RequirePermission("membership", "manage")).Delete("/", deps.Users.RemoveMember)
			})
		})

		// Role & permission management
		r.Route("/api/v1/roles", func(r chi.Router) {
			r.Use(middleware.RequireTenant)
			r.With(middleware.RequirePermission("role", "create")).Post("/", deps.Roles.Create)
			r.With(middleware.RequirePermission("role", "read")).Get("/", deps.Roles.ListByTenant)

			r.Route("/{roleID}", func(r chi.Router) {
				r.With(middleware.RequirePermission("role", "read")).Get("/", deps.Roles.GetByID)
				r.With(middleware.RequirePermission("role", "update")).Put("/", deps.Roles.Update)
				r.With(middleware.RequirePermission("role", "delete")).Delete("/", deps.Roles.Delete)
			})
		})

		r.With(middleware.RequirePermission("role", "read")).Get("/api/v1/permissions", deps.Roles.ListPermissions)

		// Audit logs
		r.Route("/api/v1/audit-logs", func(r chi.Router) {
			r.Use(middleware.RequireTenant)
			r.With(middleware.RequirePermission("audit_log", "read")).Get("/", deps.Audit.ListByTenant)
		})
	})

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Tenant-ID, X-Request-ID")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
