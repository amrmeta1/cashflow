package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/finch-co/cashflow/internal/agent/engine"
	"github.com/finch-co/cashflow/internal/agent/handler"
	"github.com/finch-co/cashflow/internal/agent/repository"
	"github.com/finch-co/cashflow/internal/ai"
	"github.com/finch-co/cashflow/internal/api"
	"github.com/finch-co/cashflow/internal/api/handlers"
	"github.com/finch-co/cashflow/internal/auth"
	"github.com/finch-co/cashflow/internal/config"
	"github.com/finch-co/cashflow/internal/db"
	"github.com/finch-co/cashflow/internal/db/repositories"
	"github.com/finch-co/cashflow/internal/enterprise"
	"github.com/finch-co/cashflow/internal/events"
	"github.com/finch-co/cashflow/internal/liquidity"
	"github.com/finch-co/cashflow/internal/observability"
	"github.com/finch-co/cashflow/internal/operations"
	"github.com/finch-co/cashflow/internal/treasury/pipeline"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	if err := run(); err != nil {
		log.Fatal().Err(err).Msg("application failed")
	}
}

func run() error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Load config
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	// Init OpenTelemetry
	shutdownTracer, err := observability.InitTracer(ctx, cfg.OTEL)
	if err != nil {
		return fmt.Errorf("initializing tracer: %w", err)
	}
	defer shutdownTracer(ctx)

	// Connect to database
	pool, err := db.NewPool(ctx, cfg.Database)
	if err != nil {
		return fmt.Errorf("connecting to database: %w", err)
	}
	defer pool.Close()
	log.Info().Str("host", cfg.Database.Host).Int("port", cfg.Database.Port).Msg("connected to database")

	// Connect to NATS JetStream (optional)
	var nc *nats.Conn
	var js jetstream.JetStream
	var publisher *events.Publisher

	if cfg.NATS.URL != "" {
		var err error
		nc, js, err = events.Connect(ctx, cfg.NATS)
		if err != nil {
			return fmt.Errorf("connecting to nats: %w", err)
		}
		defer nc.Close()
		publisher = events.NewPublisher(js)
		log.Info().Str("url", cfg.NATS.URL).Msg("connected to nats")
	} else {
		log.Warn().Msg("nats disabled - no URL configured")
	}

	_ = publisher // available for usecases that need to emit domain events
	_ = js        // available for starting consumer workers

	// Init Keycloak auth (OPTIONAL - for demo mode, can be disabled)
	var jwtValidator *auth.Validator
	authDevMode := os.Getenv("AUTH_DEV_MODE")

	if authDevMode == "true" || authDevMode == "1" {
		log.Warn().Msg("AUTH DISABLED - running in demo mode without authentication")
		jwtValidator = nil
	} else {
		jwksClient := auth.NewJWKSClient(
			cfg.Auth.JWKSURL,
			time.Duration(cfg.Auth.JWKSCacheTTL)*time.Second,
		)
		jwtValidator = auth.NewValidator(jwksClient, cfg.Auth.IssuerURL, cfg.Auth.Audience)
		log.Info().Str("issuer", cfg.Auth.IssuerURL).Str("jwks", cfg.Auth.JWKSURL).Msg("keycloak auth configured")
	}

	// Init repositories
	tenantRepo := repositories.NewTenantRepo(pool)
	userRepo := repositories.NewUserRepo(pool)
	membershipRepo := repositories.NewMembershipRepo(pool)
	auditRepo := repositories.NewAuditLogRepo(pool)
	bankTxnRepo := repositories.NewBankTransactionRepo(pool)

	// Init use cases
	tenantUC := enterprise.NewTenantUseCase(tenantRepo, membershipRepo, auditRepo)
	memberUC := enterprise.NewMemberUseCase(userRepo, membershipRepo, auditRepo)

	// Init HTTP handlers
	tenantHandler := handlers.NewTenantHandler(tenantUC)
	memberHandler := handlers.NewMemberHandler(memberUC)
	auditHandler := handlers.NewAuditHandler(auditRepo)

	// RAG handlers - proxy to RAG service
	ragServiceURL := os.Getenv("RAG_SERVICE_URL")
	var ragProxy *handlers.RAGProxyHandler

	if ragServiceURL != "" {
		ragProxy = handlers.NewRAGProxyHandler(ragServiceURL)
		fmt.Printf("✓ RAG handlers enabled (proxy to %s)\n", ragServiceURL)
	} else {
		fmt.Println("⚠ RAG handlers disabled (RAG_SERVICE_URL not set)")
	}

	// Operations handler for cash position
	// Initialize with minimal dependencies - will need bank account repo
	bankAccountRepo := repositories.NewBankAccountRepo(pool)

	// Initialize Vendor Learning and Identity services
	vendorRuleRepo := repositories.NewVendorRuleRepo(pool)
	vendorLearning := operations.NewVendorLearningService(vendorRuleRepo)

	vendorRepo := repositories.NewVendorRepo(pool)
	vendorIdentity := operations.NewVendorIdentityService(vendorRepo)

	// Initialize Vendor Stats service
	vendorStatsRepo := repositories.NewVendorStatsRepo(pool)
	vendorStats := operations.NewVendorStatsService(vendorStatsRepo)

	// Initialize Cash Flow DNA service
	cashFlowPatternRepo := repositories.NewCashFlowPatternRepo(pool)
	cashFlowDNA := operations.NewCashFlowDNAService(cashFlowPatternRepo, bankTxnRepo)

	// Signal Engine (AI Agent Phase A)
	signalRepo := repository.NewSignalRepository(pool)
	forecastUC := liquidity.NewForecastUseCase(bankTxnRepo, bankAccountRepo)
	signalEngine := engine.NewSignalEngine(bankTxnRepo, signalRepo, forecastUC)
	signalHandler := handler.NewSignalHandler(signalEngine)
	fmt.Println("✓ Signal Engine initialized (Phase A - deterministic)")

	// Initialize Advisor service and AI Classifier
	advisorUC := liquidity.NewAdvisorUseCase()
	classifier := ai.NewTransactionClassifier(bankTxnRepo)

	// Initialize repositories needed for ingestion
	rawTxnRepo := repositories.NewRawBankTransactionRepo(pool)
	jobRepo := repositories.NewIngestionJobRepo(pool)
	idempotencyRepo := repositories.NewIdempotencyRepo(pool)
	analysisRepo := repositories.NewAnalysisRepo(pool)

	// Initialize Analysis Service
	analysisService := operations.NewAnalysisService(analysisRepo, bankTxnRepo)

	// ========================================
	// NEW: Treasury Pipeline Worker Setup
	// ========================================
	var pipelineWorker *pipeline.Worker

	if js != nil {
		// Create pipeline orchestrator
		orchestrator := pipeline.NewOrchestrator(
			classifier,
			vendorStats,
			cashFlowDNA,
			forecastUC,
			advisorUC,
			analysisService,
		)

		log.Info().Msg("pipeline orchestrator created")

		// Create pipeline worker
		var err error
		pipelineWorker, err = pipeline.NewWorker(js, orchestrator)
		if err != nil {
			log.Error().Err(err).Msg("failed to create pipeline worker - continuing without it")
		} else {
			log.Info().Msg("pipeline worker created successfully")

			// Start worker in background
			go func() {
				log.Info().Msg("starting treasury pipeline worker...")
				if err := pipelineWorker.Start(ctx); err != nil {
					log.Error().Err(err).Msg("pipeline worker failed")
				}
			}()
		}
	} else {
		log.Warn().Msg("pipeline worker disabled - NATS not available")
	}
	// ========================================

	// AI Advisor handlers - create with analysisRepo
	analysisHandler := handlers.NewAnalysisHandler(bankTxnRepo, analysisRepo)

	ingestionUC := operations.NewUseCase(bankAccountRepo, rawTxnRepo, bankTxnRepo, jobRepo, idempotencyRepo, nil, vendorLearning, vendorIdentity, vendorStats, cashFlowDNA, forecastUC, advisorUC, classifier, analysisService)
	ingestionHandler := operations.NewIngestionHandler(ingestionUC)

	// Vendor handlers
	vendorRuleHandler := operations.NewVendorRuleHandler(vendorLearning)
	vendorHandler := operations.NewVendorHandler(vendorStats)

	// Cash Flow DNA handler
	cashFlowDNAHandler := operations.NewCashFlowDNAHandler(cashFlowDNA)

	// Analysis Enhancements handler
	analysisEnhancementsHandler := operations.NewAnalysisEnhancementsHandler(ingestionUC)

	// Liquidity Module (Forecast, Cash Story, Decisions)
	forecastHandler := liquidity.NewForecastHandler(forecastUC)

	// Note: CashStory and DecisionEngine require LLM client which may not be available
	// For now, we'll create a composite handler with forecast only
	// Cash story and decisions will return empty/mock data until LLM is configured
	var liquidityHandler *liquidity.CompositeHandler

	// Try to initialize with minimal dependencies
	cashStoryUC := liquidity.NewCashStoryUseCase(bankTxnRepo, forecastUC, nil) // nil LLM client
	decisionEngine := liquidity.NewDecisionEngine(forecastUC, bankTxnRepo)
	liquidityHandler = liquidity.NewCompositeHandler(forecastHandler, cashStoryUC, decisionEngine)
	fmt.Println("✓ Liquidity module initialized (forecast, cash-story, decisions)")

	// Build router
	router := api.NewRouter(api.RouterDeps{
		Validator:            jwtValidator,
		Users:                userRepo,
		Memberships:          membershipRepo,
		AuditRepo:            auditRepo,
		Tenants:              tenantHandler,
		Members:              memberHandler,
		Audit:                auditHandler,
		Documents:            ragProxy,
		Analysis:             analysisHandler,
		AnalysisEnhancements: analysisEnhancementsHandler,
		RagQuery:             ragProxy,
		CashPosition:         ingestionHandler,
		Ingestion:            ingestionHandler,
		VendorRules:          vendorRuleHandler,
		Vendors:              vendorHandler,
		CashFlowDNA:          cashFlowDNAHandler,
		Signals:              signalHandler,
		Liquidity:            liquidityHandler,
	})

	// Start HTTP server
	srv := &http.Server{
		Addr:         cfg.Server.Addr(),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info().Str("addr", srv.Addr).Msg("starting HTTP server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return fmt.Errorf("server error: %w", err)
	case sig := <-quit:
		log.Info().Str("signal", sig.String()).Msg("shutting down")
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 10*time.Second)
	defer shutdownCancel()

	// Stop pipeline worker gracefully
	if pipelineWorker != nil {
		log.Info().Msg("stopping pipeline worker...")
		pipelineWorker.Stop()
	}

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}

	log.Info().Msg("server stopped gracefully")
	return nil
}
