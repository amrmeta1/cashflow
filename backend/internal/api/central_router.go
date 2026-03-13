package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/finch-co/cashflow/internal/auth"
	"github.com/finch-co/cashflow/internal/middleware"
	"github.com/finch-co/cashflow/internal/models"
)

// CentralRouterDeps holds all dependencies for the central API router
type CentralRouterDeps struct {
	// Auth & repositories
	Validator   *auth.Validator
	Users       models.UserRepository
	Memberships models.MembershipRepository
	AuditRepo   models.AuditLogRepository

	// Module routers (mounted as sub-routers)
	LiquidityRouter  http.Handler
	OperationsRouter http.Handler
	ReportingRouter  http.Handler
	AIRouter         http.Handler

	// Enterprise handlers (mounted directly, not as router)
	TenantHandler *interface {
		Create(http.ResponseWriter, *http.Request)
		GetByID(http.ResponseWriter, *http.Request)
	}
	MemberHandler *interface {
		GetProfile(http.ResponseWriter, *http.Request)
		AddMember(http.ResponseWriter, *http.Request)
		ListMembers(http.ResponseWriter, *http.Request)
		RemoveMember(http.ResponseWriter, *http.Request)
		ChangeMemberRole(http.ResponseWriter, *http.Request)
	}
	AuditHandler *interface {
		ListByTenant(http.ResponseWriter, *http.Request)
	}
}

// NewCentralRouter creates the central API router with all module routes
// mounted under /api/v1/
func NewCentralRouter(deps CentralRouterDeps) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.RequestLogging)
	r.Use(chimw.Recoverer)
	r.Use(centralCorsMiddleware)

	// Health check (unauthenticated)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Apply auth middleware (demo mode if validator is nil)
		r.Use(middleware.DemoMode(deps.Users))
		r.Use(middleware.TenantFromHeader)

		// Tenant context required for all module routes
		r.Route("/tenants/{tenantID}", func(r chi.Router) {
			r.Use(middleware.TenantFromRouteParam("tenantID"))
			r.Use(middleware.TenantRateLimit(100, time.Minute))

			// Mount module routers
			if deps.LiquidityRouter != nil {
				r.Mount("/liquidity", deps.LiquidityRouter)
			}

			if deps.OperationsRouter != nil {
				r.Mount("/operations", deps.OperationsRouter)
			}

			if deps.ReportingRouter != nil {
				r.Mount("/reporting", deps.ReportingRouter)
			}

			if deps.AIRouter != nil {
				r.Mount("/ai", deps.AIRouter)
			}
		})

		// Enterprise routes handled by api/router.go
		// (tenant management, user profiles, audit logs)
	})

	return r
}

func centralCorsMiddleware(next http.Handler) http.Handler {
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
