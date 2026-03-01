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

	"github.com/finch-co/cashflow/internal/adapter/db"
	httpAdapter "github.com/finch-co/cashflow/internal/adapter/http"
	"github.com/finch-co/cashflow/internal/auth"
	"github.com/finch-co/cashflow/internal/config"
	"github.com/finch-co/cashflow/internal/events"
	"github.com/finch-co/cashflow/internal/observability"
	"github.com/finch-co/cashflow/internal/usecase"
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

	// Connect to NATS JetStream
	nc, js, err := events.Connect(ctx, cfg.NATS)
	if err != nil {
		return fmt.Errorf("connecting to nats: %w", err)
	}
	defer nc.Close()

	// Create event publisher
	publisher := events.NewPublisher(js)
	_ = publisher // available for usecases that need to emit domain events
	_ = js        // available for starting consumer workers

	// Init Keycloak JWKS client + JWT validator
	jwksClient := auth.NewJWKSClient(
		cfg.Auth.JWKSURL,
		time.Duration(cfg.Auth.JWKSCacheTTL)*time.Second,
	)
	jwtValidator := auth.NewValidator(jwksClient, cfg.Auth.IssuerURL, cfg.Auth.Audience)
	log.Info().Str("issuer", cfg.Auth.IssuerURL).Str("jwks", cfg.Auth.JWKSURL).Msg("keycloak auth configured")

	// Init repositories
	tenantRepo := db.NewTenantRepo(pool)
	userRepo := db.NewUserRepo(pool)
	membershipRepo := db.NewMembershipRepo(pool)
	auditRepo := db.NewAuditLogRepo(pool)

	// Init use cases
	tenantUC := usecase.NewTenantUseCase(tenantRepo, membershipRepo, auditRepo)
	memberUC := usecase.NewMemberUseCase(userRepo, membershipRepo, auditRepo)

	// Init HTTP handlers
	tenantHandler := httpAdapter.NewTenantHandler(tenantUC)
	memberHandler := httpAdapter.NewMemberHandler(memberUC)
	auditHandler := httpAdapter.NewAuditHandler(auditRepo)

	// Build router
	router := httpAdapter.NewRouter(httpAdapter.RouterDeps{
		Validator: jwtValidator,
		Users:     userRepo,
		AuditRepo: auditRepo,
		Tenants:   tenantHandler,
		Members:   memberHandler,
		Audit:     auditHandler,
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

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}

	log.Info().Msg("server stopped gracefully")
	return nil
}
