package examples

// This file shows how to integrate the pipeline worker into tenant-service
// Copy the relevant parts to cmd/tenant-service/main.go

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ai"
	"github.com/finch-co/cashflow/internal/config"
	"github.com/finch-co/cashflow/internal/db"
	"github.com/finch-co/cashflow/internal/db/repositories"
	"github.com/finch-co/cashflow/internal/events"
	"github.com/finch-co/cashflow/internal/liquidity"
	"github.com/finch-co/cashflow/internal/operations"
	"github.com/finch-co/cashflow/internal/treasury/pipeline"
)

// IntegratePipelineWorker shows how to set up the treasury pipeline worker
func IntegratePipelineWorker() error {
	ctx := context.Background()

	// 1. Load configuration
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	// 2. Connect to database
	pool, err := db.NewPool(ctx, cfg.Database)
	if err != nil {
		return fmt.Errorf("connecting to database: %w", err)
	}
	defer pool.Close()

	// 3. Initialize repositories (existing code)
	txnRepo := repositories.NewBankTransactionRepo(pool)
	analysisRepo := repositories.NewAnalysisRepo(pool)
	vendorStatsRepo := repositories.NewVendorStatsRepo(pool)
	patternRepo := repositories.NewCashFlowPatternRepo(pool)
	bankAccountRepo := repositories.NewBankAccountRepo(pool)

	// 4. Initialize services (existing code)
	classifier := ai.NewTransactionClassifier(txnRepo)
	vendorStats := operations.NewVendorStatsService(vendorStatsRepo)
	cashFlowDNA := operations.NewCashFlowDNAService(patternRepo, txnRepo)
	forecastUC := liquidity.NewForecastUseCase(txnRepo, bankAccountRepo)
	advisorUC := liquidity.NewAdvisorUseCase()
	analysisService := operations.NewAnalysisService(analysisRepo, txnRepo)

	// 5. Connect to NATS
	nc, err := nats.Connect(cfg.NATS.URL)
	if err != nil {
		return fmt.Errorf("connecting to NATS: %w", err)
	}
	defer nc.Close()

	// 6. Create JetStream context
	js, err := jetstream.New(nc)
	if err != nil {
		return fmt.Errorf("creating jetstream: %w", err)
	}

	// 7. Ensure stream exists
	_, err = js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:      events.StreamCashflow,
		Subjects:  []string{"cashflow.*"},
		Storage:   jetstream.FileStorage,
		Retention: jetstream.WorkQueuePolicy,
	})
	if err != nil {
		log.Warn().Err(err).Msg("stream may already exist")
	}

	// 8. Create pipeline orchestrator
	orchestrator := pipeline.NewOrchestrator(
		classifier,
		vendorStats,
		cashFlowDNA,
		forecastUC,
		advisorUC,
		analysisService,
	)

	log.Info().Msg("pipeline orchestrator created")

	// 9. Create pipeline worker
	worker, err := pipeline.NewWorker(js, orchestrator)
	if err != nil {
		return fmt.Errorf("creating pipeline worker: %w", err)
	}

	log.Info().Msg("pipeline worker created")

	// 10. Start worker in background
	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()

	go func() {
		log.Info().Msg("starting pipeline worker...")
		if err := worker.Start(workerCtx); err != nil {
			log.Error().Err(err).Msg("pipeline worker failed")
		}
	}()

	log.Info().Msg("pipeline worker started in background")

	// 11. Start your existing HTTP server here
	// server := setupHTTPServer(cfg)
	// go server.ListenAndServe()

	// 12. Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down...")

	// 13. Stop worker gracefully
	worker.Stop()
	workerCancel()

	log.Info().Msg("service exited")
	return nil
}

// Example: Manual pipeline trigger (for testing or admin endpoints)
func TriggerPipelineManually(orchestrator *pipeline.Orchestrator, tenantID string) error {
	_ = context.Background() // Context for future use

	// Parse tenant ID
	// tid, err := uuid.Parse(tenantID)
	// if err != nil {
	// 	return fmt.Errorf("invalid tenant ID: %w", err)
	// }

	// Execute pipeline
	// result, err := orchestrator.Execute(ctx, tid)
	// if err != nil {
	// 	return fmt.Errorf("pipeline execution failed: %w", err)
	// }

	// log.Info().
	// 	Str("tenant_id", tenantID).
	// 	Int("steps_completed", result.StepsCompleted).
	// 	Int("steps_failed", result.StepsFailed).
	// 	Dur("duration", result.Duration).
	// 	Msg("pipeline executed manually")

	return nil
}

// Example: Health check endpoint for pipeline worker
func PipelineHealthCheck(worker *pipeline.Worker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check if worker is running
		// Return 200 OK if healthy, 503 if not

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","service":"pipeline-worker"}`))
	}
}
