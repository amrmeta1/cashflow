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
	"github.com/finch-co/cashflow/internal/adapter/integrations"
	"github.com/finch-co/cashflow/internal/adapter/mq"
	"github.com/finch-co/cashflow/internal/adapter/worker"
	"github.com/finch-co/cashflow/internal/analysis"
	"github.com/finch-co/cashflow/internal/auth"
	"github.com/finch-co/cashflow/internal/config"
	"github.com/finch-co/cashflow/internal/ingestion"
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

	// Connect to RabbitMQ
	rmqConn, rmqCh, err := mq.Connect(cfg.RabbitMQ)
	if err != nil {
		return fmt.Errorf("connecting to rabbitmq: %w", err)
	}
	defer rmqConn.Close()
	defer rmqCh.Close()
	log.Info().Str("url", cfg.RabbitMQ.URL).Msg("connected to rabbitmq")

	// Create publisher
	publisher := mq.NewPublisher(rmqCh, cfg.RabbitMQ.PublishRetries)

	// Init Keycloak JWKS client + JWT validator
	jwksClient := auth.NewJWKSClient(
		cfg.Auth.JWKSURL,
		time.Duration(cfg.Auth.JWKSCacheTTL)*time.Second,
	)
	jwtValidator := auth.NewValidator(jwksClient, cfg.Auth.IssuerURL, cfg.Auth.Audience)
	log.Info().Str("issuer", cfg.Auth.IssuerURL).Msg("keycloak auth configured")

	// Init repositories
	userRepo := db.NewUserRepo(pool)
	auditRepo := db.NewAuditLogRepo(pool)
	bankAccountRepo := db.NewBankAccountRepo(pool)
	rawTxnRepo := db.NewRawBankTransactionRepo(pool)
	bankTxnRepo := db.NewBankTransactionRepo(pool)
	jobRepo := db.NewIngestionJobRepo(pool)
	idempotencyRepo := db.NewIdempotencyRepo(pool)
	analysisRepo := db.NewAnalysisRepo(pool)

	// Init use cases (bounded contexts: ingestion, analysis, forecast)
	ingestionUC := ingestion.NewUseCase(
		bankAccountRepo,
		rawTxnRepo,
		bankTxnRepo,
		jobRepo,
		idempotencyRepo,
		publisher,
	)
	analysisUC := analysis.NewUseCase(analysisRepo)
	forecastUC := usecase.NewForecastUseCase(bankTxnRepo, bankAccountRepo)

	// Init HTTP handlers
	ingestionHandler := httpAdapter.NewIngestionHandler(ingestionUC, publisher)
	analysisHandler := httpAdapter.NewAnalysisHandler(analysisUC, analysisRepo)
	forecastHandler := httpAdapter.NewForecastHandler(forecastUC)

	// Build router
	router := httpAdapter.NewIngestionRouter(httpAdapter.IngestionRouterDeps{
		Validator: jwtValidator,
		Users:     userRepo,
		AuditRepo: auditRepo,
		Ingestion: ingestionHandler,
		Analysis:  analysisHandler,
		Forecast:  forecastHandler,
	})

	// Start command consumer (background goroutine)
	consumerCh, err := rmqConn.Channel()
	if err != nil {
		return fmt.Errorf("opening consumer channel: %w", err)
	}
	defer consumerCh.Close()

	if err := consumerCh.Qos(cfg.RabbitMQ.PrefetchCount, 0, false); err != nil {
		return fmt.Errorf("setting consumer QoS: %w", err)
	}

	commandHandler := mq.NewIngestionCommandHandler(mq.IngestionWorkerDeps{
		Jobs:        jobRepo,
		Idempotency: idempotencyRepo,
		Bank:        integrations.NewStubBankProvider(),
		Accounting:  integrations.NewStubAccountingProvider(),
	})

	consumer := mq.NewConsumer(consumerCh, mq.QueueCommandsIngestion, commandHandler)
	go func() {
		if err := consumer.Start(ctx); err != nil {
			log.Error().Err(err).Msg("command consumer error")
		}
	}()

	// Start analysis consumer (runs analysis on analysis.requested events)
	analysisCh, err := rmqConn.Channel()
	if err != nil {
		return fmt.Errorf("opening analysis consumer channel: %w", err)
	}
	defer analysisCh.Close()
	if err := analysisCh.Qos(cfg.RabbitMQ.PrefetchCount, 0, false); err != nil {
		return fmt.Errorf("setting analysis consumer QoS: %w", err)
	}
	analysisMsgHandler := worker.NewAnalysisMessageHandler(analysisUC, publisher)
	analysisConsumer := mq.NewConsumer(analysisCh, mq.QueueAnalysisRequested, analysisMsgHandler)
	go func() {
		if err := analysisConsumer.Start(ctx); err != nil {
			log.Error().Err(err).Msg("analysis consumer error")
		}
	}()

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
