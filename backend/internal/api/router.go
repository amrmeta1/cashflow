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

type RouterDeps struct {
	Validator   *auth.Validator // Optional - can be nil for demo mode
	Users       models.UserRepository
	Memberships models.MembershipRepository
	AuditRepo   models.AuditLogRepository
	Tenants     interface {
		Create(http.ResponseWriter, *http.Request)
		GetByID(http.ResponseWriter, *http.Request)
	}
	Members interface {
		GetProfile(http.ResponseWriter, *http.Request)
		AddMember(http.ResponseWriter, *http.Request)
		ListMembers(http.ResponseWriter, *http.Request)
		RemoveMember(http.ResponseWriter, *http.Request)
		ChangeMemberRole(http.ResponseWriter, *http.Request)
	}
	Audit interface {
		ListByTenant(http.ResponseWriter, *http.Request)
	}
	Documents interface {
		UploadDocument(http.ResponseWriter, *http.Request)
		ListDocuments(http.ResponseWriter, *http.Request)
		DeleteDocument(http.ResponseWriter, *http.Request)
	}
	Analysis interface {
		GetLatestAnalysis(http.ResponseWriter, *http.Request)
	}
	AnalysisEnhancements interface {
		GetStatementHistory(http.ResponseWriter, *http.Request)
		GetDataQuality(http.ResponseWriter, *http.Request)
		GetSmartAlerts(http.ResponseWriter, *http.Request)
		GetBankInsights(http.ResponseWriter, *http.Request)
	}
	RagQuery interface {
		Query(http.ResponseWriter, *http.Request)
	}
	CashPosition interface {
		GetCashPosition(http.ResponseWriter, *http.Request)
		ImportBankJSON(http.ResponseWriter, *http.Request)
		ListBankAccounts(http.ResponseWriter, *http.Request)
	}
	VendorRules interface {
		CreateVendorRule(http.ResponseWriter, *http.Request)
		ListVendorRules(http.ResponseWriter, *http.Request)
	}
	Vendors interface {
		GetTopVendors(http.ResponseWriter, *http.Request)
	}
	CashFlowDNA interface {
		GetPatterns(http.ResponseWriter, *http.Request)
		TriggerAnalysis(http.ResponseWriter, *http.Request)
	}
	Signals interface {
		RunSignalEngine(http.ResponseWriter, *http.Request)
		GetSignals(http.ResponseWriter, *http.Request)
	}
	Liquidity interface {
		GetCurrentForecast(http.ResponseWriter, *http.Request)
		GetCashStory(http.ResponseWriter, *http.Request)
		GetRecommendedActions(http.ResponseWriter, *http.Request)
	}
	Ingestion interface {
		ImportBankCSV(http.ResponseWriter, *http.Request)
		ListBankAccounts(http.ResponseWriter, *http.Request)
	}
}

func NewRouter(deps RouterDeps) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Compress(5))
	r.Use(chimw.Timeout(60 * time.Second))

	// CORS middleware for frontend
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-ID, X-Request-ID")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	})

	// Health check (unauthenticated)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// API routes (no authentication - demo mode)
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.DemoMode(deps.Users))
		r.Use(middleware.TenantFromHeader)

		// Current user profile
		r.Get("/me", deps.Members.GetProfile)

		// Tenant CRUD
		r.Route("/tenants", func(r chi.Router) {
			r.Post("/", deps.Tenants.Create)

			r.Route("/{tenantID}", func(r chi.Router) {
				r.Use(middleware.TenantFromRouteParam("tenantID"))
				r.Use(middleware.TenantRateLimit(100, time.Minute))

				r.Get("/", deps.Tenants.GetByID)

				// Members sub-resource
				r.Post("/members", deps.Members.AddMember)
				r.Get("/members", deps.Members.ListMembers)
				r.Delete("/members/{membershipID}", deps.Members.RemoveMember)

				// Role change
				r.Post("/roles", deps.Members.ChangeMemberRole)

				// Documents (AI Advisor)
				if deps.Documents != nil {
					r.Post("/documents", deps.Documents.UploadDocument)
					r.Get("/documents", deps.Documents.ListDocuments)
					r.Delete("/documents/{documentID}", deps.Documents.DeleteDocument)
				}

				// Cash Analysis (AI Advisor)
				if deps.Analysis != nil {
					r.Get("/analysis/latest", deps.Analysis.GetLatestAnalysis)
				}

				// Analysis Enhancements
				if deps.AnalysisEnhancements != nil {
					r.Get("/analysis/statement-history", deps.AnalysisEnhancements.GetStatementHistory)
					r.Get("/analysis/data-quality", deps.AnalysisEnhancements.GetDataQuality)
					r.Get("/analysis/smart-alerts", deps.AnalysisEnhancements.GetSmartAlerts)
					r.Get("/analysis/bank-insights", deps.AnalysisEnhancements.GetBankInsights)
				}

				// RAG Query (AI Advisor)
				if deps.RagQuery != nil {
					r.Post("/rag/query", deps.RagQuery.Query)
				}

				// Cash Position
				if deps.CashPosition != nil {
					r.Get("/cash-position", deps.CashPosition.GetCashPosition)
				}

				// Audit logs
				if deps.Audit != nil {
					r.Get("/audit-logs", deps.Audit.ListByTenant)
				}

				// Signals (AI Agent)
				if deps.Signals != nil {
					r.Post("/signals/run", deps.Signals.RunSignalEngine)
					r.Get("/signals", deps.Signals.GetSignals)
				}

				// Liquidity Module
				if deps.Liquidity != nil {
					r.Get("/liquidity/forecast", deps.Liquidity.GetCurrentForecast)
					r.Get("/liquidity/cash-story", deps.Liquidity.GetCashStory)
					r.Get("/liquidity/decisions", deps.Liquidity.GetRecommendedActions)
				}

				// Import endpoints (operations)
				if deps.CashPosition != nil {
					r.Post("/imports/bank-json", deps.CashPosition.ImportBankJSON)
				}
				if deps.Ingestion != nil {
					r.Post("/imports/bank-csv", deps.Ingestion.ImportBankCSV)
					r.Get("/bank-accounts", deps.Ingestion.ListBankAccounts)
				}

				// Vendor Learning Rules
				if deps.VendorRules != nil {
					r.Post("/vendor-rules", deps.VendorRules.CreateVendorRule)
					r.Get("/vendor-rules", deps.VendorRules.ListVendorRules)
				}

				// Vendor Intelligence
				if deps.Vendors != nil {
					r.Get("/vendors/top", deps.Vendors.GetTopVendors)
				}

				// Cash Flow DNA
				if deps.CashFlowDNA != nil {
					r.Get("/cashflow/patterns", deps.CashFlowDNA.GetPatterns)
					r.Post("/cashflow/analyze", deps.CashFlowDNA.TriggerAnalysis)
				}
			})
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
