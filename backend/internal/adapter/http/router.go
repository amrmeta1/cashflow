package http

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/finch-co/cashflow/internal/auth"
	"github.com/finch-co/cashflow/internal/domain"
	"github.com/finch-co/cashflow/internal/middleware"
)

type RouterDeps struct {
	Validator   *auth.Validator
	Users       domain.UserRepository
	Memberships domain.MembershipRepository
	AuditRepo   domain.AuditLogRepository
	Tenants     *TenantHandler
	Members     *MemberHandler
	Audit       *AuditHandler
}

func NewRouter(deps RouterDeps) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.RequestLogging)
	r.Use(chimw.Recoverer)
	r.Use(corsMiddleware)

	// Health check (unauthenticated)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// Authenticated routes (Keycloak JWT)
	r.Group(func(r chi.Router) {
		r.Use(middleware.KeycloakAuth(deps.Validator, deps.AuditRepo))
		r.Use(middleware.TenantFromHeader)
		r.Use(middleware.ProvisionUser(deps.Users))

		// Current user profile
		r.Get("/me", deps.Members.GetProfile)

		// Tenant CRUD
		r.Route("/tenants", func(r chi.Router) {
			r.With(middleware.RequirePermission(auth.PermTenantCreate)).Post("/", deps.Tenants.Create)

			r.Route("/{tenantID}", func(r chi.Router) {
				r.Use(middleware.TenantFromRouteParam("tenantID"))
				r.Use(middleware.RequireTenantMembership(deps.Memberships))
				r.Use(middleware.TenantRateLimit(100, time.Minute))

				r.Get("/", deps.Tenants.GetByID)

				// Members sub-resource
				r.Post("/members", deps.Members.AddMember)
				r.Get("/members", deps.Members.ListMembers)
				r.Delete("/members/{membershipID}", deps.Members.RemoveMember)

				// Role change
				r.Post("/roles", deps.Members.ChangeMemberRole)
			})
		})

		// Audit logs (requires tenant context)
		r.Route("/audit-logs", func(r chi.Router) {
			r.Use(middleware.RequireTenant)
			r.Use(middleware.RequireTenantMembership(deps.Memberships))
			r.Use(middleware.TenantRateLimit(100, time.Minute))
			r.With(middleware.RequirePermission(auth.PermAuditRead)).Get("/", deps.Audit.ListByTenant)
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
