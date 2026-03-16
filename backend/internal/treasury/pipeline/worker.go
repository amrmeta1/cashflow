package pipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/events"
)

// Worker consumes transaction import events and triggers the treasury pipeline.
type Worker struct {
	consumer     jetstream.Consumer
	orchestrator *Orchestrator
	stopCh       chan struct{}
}

// NewWorker creates a new pipeline worker.
func NewWorker(js jetstream.JetStream, orchestrator *Orchestrator) (*Worker, error) {
	// Create or get consumer
	consumer, err := js.CreateOrUpdateConsumer(context.Background(), events.StreamCashflow, jetstream.ConsumerConfig{
		Name:          events.ConsumerTreasuryPipeline,
		Durable:       events.ConsumerTreasuryPipeline,
		FilterSubject: events.SubjectTransactionsImported,
		AckPolicy:     jetstream.AckExplicitPolicy,
		MaxDeliver:    3, // Retry up to 3 times
		AckWait:       5 * time.Minute,
	})
	if err != nil {
		return nil, fmt.Errorf("creating consumer: %w", err)
	}

	return &Worker{
		consumer:     consumer,
		orchestrator: orchestrator,
		stopCh:       make(chan struct{}),
	}, nil
}

// Start begins consuming events and processing them.
func (w *Worker) Start(ctx context.Context) error {
	log.Info().
		Str("consumer", events.ConsumerTreasuryPipeline).
		Str("subject", events.SubjectTransactionsImported).
		Msg("treasury pipeline worker started")

	// Consume messages
	consumerCtx, err := w.consumer.Consume(func(msg jetstream.Msg) {
		w.handleMessage(ctx, msg)
	})
	if err != nil {
		return fmt.Errorf("starting consumer: %w", err)
	}

	// Wait for stop signal
	<-w.stopCh

	// Stop consuming
	consumerCtx.Stop()

	log.Info().Msg("treasury pipeline worker stopped")
	return nil
}

// Stop signals the worker to stop processing.
func (w *Worker) Stop() {
	close(w.stopCh)
}

// handleMessage processes a single event message.
func (w *Worker) handleMessage(ctx context.Context, msg jetstream.Msg) {
	startTime := time.Now()

	// Parse envelope
	var envelope events.Envelope
	if err := json.Unmarshal(msg.Data(), &envelope); err != nil {
		log.Error().Err(err).Msg("failed to unmarshal event envelope")
		_ = msg.Nak()
		return
	}

	log.Debug().
		Str("event_id", envelope.EventID).
		Str("event_type", envelope.EventType).
		Str("tenant_id", envelope.TenantID).
		Msg("processing treasury pipeline event")

	// Parse payload
	var payload events.TransactionsImportedPayload
	payloadBytes, err := json.Marshal(envelope.Payload)
	if err != nil {
		log.Error().Err(err).Msg("failed to marshal payload")
		_ = msg.Nak()
		return
	}

	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		log.Error().Err(err).Msg("failed to unmarshal payload")
		_ = msg.Nak()
		return
	}

	// Parse tenant ID
	tenantID, err := uuid.Parse(payload.TenantID)
	if err != nil {
		log.Error().Err(err).Str("tenant_id", payload.TenantID).Msg("invalid tenant ID")
		_ = msg.Nak()
		return
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Int("transaction_count", payload.TransactionCount).
		Str("source", payload.Source).
		Msg("triggering treasury pipeline")

	// Execute pipeline
	result, err := w.orchestrator.Execute(ctx, tenantID)
	if err != nil {
		log.Error().
			Err(err).
			Str("tenant_id", tenantID.String()).
			Dur("duration", time.Since(startTime)).
			Msg("pipeline execution failed")
		
		// Check if we should retry
		metadata, _ := msg.Metadata()
		if metadata.NumDelivered >= 3 {
			log.Error().
				Str("tenant_id", tenantID.String()).
				Uint64("num_delivered", metadata.NumDelivered).
				Msg("max retries exceeded, message will be moved to dead letter")
			_ = msg.Term() // Terminate - move to dead letter
		} else {
			_ = msg.Nak() // Negative ack - will be redelivered
		}
		return
	}

	// Log success metrics
	log.Info().
		Str("tenant_id", tenantID.String()).
		Dur("total_duration", result.Duration).
		Int("steps_completed", result.StepsCompleted).
		Int("steps_failed", result.StepsFailed).
		Int("health_score", result.FinalHealthScore).
		Int("runway_days", result.FinalRunwayDays).
		Msg("pipeline execution completed successfully")

	// Acknowledge message
	if err := msg.Ack(); err != nil {
		log.Error().Err(err).Msg("failed to acknowledge message")
	}
}

// StartAsync starts the worker in a goroutine.
func (w *Worker) StartAsync(ctx context.Context) {
	go func() {
		if err := w.Start(ctx); err != nil {
			log.Error().Err(err).Msg("worker failed")
		}
	}()
}
