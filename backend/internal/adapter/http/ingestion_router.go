package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/finch-co/cashflow/internal/auth"
	"github.com/finch-co/cashflow/internal/domain"
	"github.com/finch-co/cashflow/internal/middleware"
)

// IngestionRouterDeps holds dependencies for the ingestion service router.
type IngestionRouterDeps struct {
	Validator *auth.Validator
	Users     domain.UserRepository
	AuditRepo domain.AuditLogRepository
	Ingestion *IngestionHandler
	Analysis  *AnalysisHandler
	Forecast  *ForecastHandler
}

// NewIngestionRouter builds the chi router for the ingestion service.
func NewIngestionRouter(deps IngestionRouterDeps) http.Handler {
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
		_, _ = w.Write([]byte(`{"status":"ok","service":"ingestion-service"}`))
	})

	// Authenticated routes (Keycloak JWT)
	r.Group(func(r chi.Router) {
		r.Use(middleware.KeycloakAuth(deps.Validator, deps.AuditRepo))
		r.Use(middleware.TenantFromHeader)
		r.Use(middleware.ProvisionUser(deps.Users))

		r.Route("/tenants/{tenantID}", func(r chi.Router) {
			// CSV import
			r.Post("/imports/bank-csv", deps.Ingestion.ImportBankCSV)

			// Transactions
			r.Get("/transactions", deps.Ingestion.ListTransactions)

			// Cash position (treasury/forecast read)
			r.With(middleware.RequirePermission(auth.PermTreasuryRead)).Get("/cash-position", deps.Ingestion.GetCashPosition)

			// Bank accounts
			r.Post("/bank-accounts", deps.Ingestion.CreateBankAccount)

			// Sync commands
			r.Post("/sync/bank", deps.Ingestion.SyncBank)
			r.Post("/sync/accounting", deps.Ingestion.SyncAccounting)

			// Cash analysis (run and get latest)
			r.With(middleware.RequirePermission(auth.PermIngestionRead)).Get("/analysis/latest", deps.Analysis.GetLatest)
			r.With(middleware.RequirePermission(auth.PermIngestionRead)).Post("/analysis/run", deps.Analysis.RunAnalysis)

			// Cash forecast (13-week deterministic forecast)
			r.With(middleware.RequirePermission(auth.PermTreasuryRead)).Get("/forecast/current", deps.Forecast.GetCurrentForecast)
		})
	})

	return r
}
