package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/config"
	"github.com/finch-co/cashflow/internal/events"
)

// This is an example consumer worker that demonstrates how to process
// events from NATS JetStream with at-least-once delivery, idempotency,
// retry with exponential backoff, and dead-letter on max retries.
//
// Usage:
//   go run ./cmd/worker-example
//
// It consumes cashflow.transactions.ingested events and logs them.

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	if err := run(); err != nil {
		log.Fatal().Err(err).Msg("worker failed")
	}
}

func run() error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	// Connect to NATS JetStream (provisions streams if needed)
	nc, js, err := events.Connect(ctx, cfg.NATS)
	if err != nil {
		return fmt.Errorf("connecting to nats: %w", err)
	}
	defer nc.Close()

	// Create a consumer worker for transaction ingestion events.
	// The handler function is where your business logic goes.
	worker := events.NewConsumerWorker(
		js,
		cfg.NATS,
		"transactions-processor",                // durable consumer name
		events.SubjectTransactionsIngested,       // subject to consume
		handleTransactionIngested,                // handler function
	)

	// Run the worker (blocks until ctx is cancelled)
	errCh := make(chan error, 1)
	go func() {
		errCh <- worker.Run(ctx)
	}()

	// Also demonstrate publishing an event
	publisher := events.NewPublisher(js)
	err = publisher.PublishNew(
		ctx,
		events.SubjectTransactionsIngested,
		"transactions.ingested",
		"00000000-0000-0000-0000-000000000001", // tenant_id
		1,                                       // version
		map[string]any{
			"account_id":        "acc-123",
			"transaction_count": 42,
			"source":            "bank_api",
		},
	)
	if err != nil {
		log.Error().Err(err).Msg("failed to publish example event")
	} else {
		log.Info().Msg("published example transaction event")
	}

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return fmt.Errorf("worker error: %w", err)
	case sig := <-quit:
		log.Info().Str("signal", sig.String()).Msg("shutting down worker")
		cancel()
	}

	return nil
}

// handleTransactionIngested is the business logic handler for transaction events.
// Returning nil ACKs the message. Returning an error triggers retry with backoff.
//
// Idempotency: Use env.IdempotencyKey to check if this event was already processed
// (e.g., by checking a processed_events table or Redis set).
func handleTransactionIngested(ctx context.Context, env *events.Envelope) error {
	log.Info().
		Str("event_id", env.EventID).
		Str("tenant_id", env.TenantID).
		Str("idempotency_key", env.IdempotencyKey).
		Int("version", env.Version).
		Str("trace_id", env.TraceID).
		RawJSON("payload", env.Payload).
		Msg("processing transaction ingestion event")

	// TODO: Implement your business logic here:
	// 1. Check idempotency (have we processed this event_id before?)
	// 2. Parse env.Payload into your domain type
	// 3. Execute business logic
	// 4. Mark event as processed in your idempotency store
	// 5. Return nil on success, or error to trigger retry

	return nil
}
