package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ai"
	"github.com/finch-co/cashflow/internal/auth"
	"github.com/finch-co/cashflow/internal/config"
	"github.com/finch-co/cashflow/internal/db"
	"github.com/finch-co/cashflow/internal/db/repositories"
	"github.com/finch-co/cashflow/internal/liquidity"
	"github.com/finch-co/cashflow/internal/observability"
	"github.com/finch-co/cashflow/internal/operations"
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
	cfg, err := config.LoadIngestion()
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

	// Connect to RabbitMQ (optional)
	var publisher interface{}
	log.Warn().Msg("rabbitmq disabled - using placeholder publisher")

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
		log.Info().Str("issuer", cfg.Auth.IssuerURL).Msg("keycloak auth configured")
	}

	// Init repositories
	userRepo := repositories.NewUserRepo(pool)
	membershipRepo := repositories.NewMembershipRepo(pool)
	auditRepo := repositories.NewAuditLogRepo(pool)
	bankAccountRepo := repositories.NewBankAccountRepo(pool)
	rawTxnRepo := repositories.NewRawBankTransactionRepo(pool)
	bankTxnRepo := repositories.NewBankTransactionRepo(pool)
	jobRepo := repositories.NewIngestionJobRepo(pool)
	idempotencyRepo := repositories.NewIdempotencyRepo(pool)

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

	// Initialize Forecast service
	forecastUC := liquidity.NewForecastUseCase(bankTxnRepo, bankAccountRepo)

	// Initialize Advisor service
	advisorUC := liquidity.NewAdvisorUseCase()

	// Initialize AI Transaction Classifier
	classifier := ai.NewTransactionClassifier(bankTxnRepo)

	// Initialize Analysis Service
	analysisRepo := repositories.NewAnalysisRepo(pool)
	analysisService := operations.NewAnalysisService(analysisRepo, bankTxnRepo)

	// Init use case
	ingestionUC := operations.NewUseCase(
		bankAccountRepo,
		rawTxnRepo,
		bankTxnRepo,
		jobRepo,
		idempotencyRepo,
		publisher,
		vendorLearning,
		vendorIdentity,
		vendorStats,
		cashFlowDNA,
		forecastUC,
		advisorUC,
		classifier,
		analysisService,
	)

	// Init HTTP handler
	ingestionHandler := operations.NewIngestionHandler(ingestionUC)

	// Placeholder handlers for routes that aren't implemented yet
	type placeholderHandler struct{}
	placeholder := &placeholderHandler{}

	// Build router
	router := operations.NewIngestionRouter(operations.IngestionRouterDeps{
		Validator:   jwtValidator,
		Users:       userRepo,
		Memberships: membershipRepo,
		AuditRepo:   auditRepo,
		Ingestion:   ingestionHandler,
		Analysis:    placeholder,
		Forecast:    placeholder,
		CashStory:   placeholder,
		Decision:    placeholder,
	})

	// RabbitMQ consumers disabled (RabbitMQ connection not initialized)
	log.Info().Msg("RabbitMQ consumers disabled - running in HTTP-only mode")

	// Start HTTP server
	srv := &http.Server{
		Addr:         cfg.Server.Addr(),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second, // longer for CSV uploads
		IdleTimeout:  60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info().Str("addr", srv.Addr).Msg("starting ingestion-service HTTP server")
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

	cancel() // stop consumer

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}

	log.Info().Msg("ingestion-service stopped gracefully")
	return nil
}
