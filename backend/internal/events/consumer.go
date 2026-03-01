package events

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/nats-io/nats.go/jetstream"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/config"
)

// Handler processes a single event envelope. Returning an error triggers
// retry (NAK with backoff). Returning nil ACKs the message.
type Handler func(ctx context.Context, env *Envelope) error

// ConsumerWorker is a skeleton for consuming events from a JetStream
// durable consumer with at-least-once processing, retry with exponential
// backoff, and dead-letter after max retries.
type ConsumerWorker struct {
	js           jetstream.JetStream
	cfg          config.NATSConfig
	consumerName string
	subject      string
	handler      Handler
	dlqSubject   string
}

// NewConsumerWorker creates a new consumer worker for the given subject.
// consumerName must be unique per logical consumer group.
func NewConsumerWorker(
	js jetstream.JetStream,
	cfg config.NATSConfig,
	consumerName string,
	subject string,
	handler Handler,
) *ConsumerWorker {
	// Derive DLQ subject: cashflow.X.Y → cashflow.dlq.X.Y
	dlq := deriveDLQSubject(subject)

	return &ConsumerWorker{
		js:           js,
		cfg:          cfg,
		consumerName: consumerName,
		subject:      subject,
		handler:      handler,
		dlqSubject:   dlq,
	}
}

// Run starts consuming messages. It blocks until the context is cancelled.
func (w *ConsumerWorker) Run(ctx context.Context) error {
	consumer, err := w.js.CreateOrUpdateConsumer(ctx, StreamCashflow, jetstream.ConsumerConfig{
		Durable:       w.consumerName,
		FilterSubject: w.subject,
		AckPolicy:     jetstream.AckExplicitPolicy,
		AckWait:       time.Duration(w.cfg.AckWait) * time.Second,
		MaxDeliver:    w.cfg.MaxDeliver,
		MaxAckPending: w.cfg.MaxAckPending,
		DeliverPolicy: jetstream.DeliverAllPolicy,
	})
	if err != nil {
		return fmt.Errorf("create consumer %s: %w", w.consumerName, err)
	}

	log.Info().
		Str("consumer", w.consumerName).
		Str("subject", w.subject).
		Int("max_deliver", w.cfg.MaxDeliver).
		Msg("consumer worker started")

	// Consume with callback
	cc, err := consumer.Consume(func(msg jetstream.Msg) {
		w.processMessage(ctx, msg)
	})
	if err != nil {
		return fmt.Errorf("start consume %s: %w", w.consumerName, err)
	}

	// Block until context is done
	<-ctx.Done()
	cc.Stop()

	log.Info().Str("consumer", w.consumerName).Msg("consumer worker stopped")
	return nil
}

func (w *ConsumerWorker) processMessage(ctx context.Context, msg jetstream.Msg) {
	env, err := UnmarshalEnvelope(msg.Data())
	if err != nil {
		log.Error().Err(err).Str("consumer", w.consumerName).Msg("unmarshal failed, sending to DLQ")
		w.sendToDLQ(ctx, msg.Data(), "unmarshal_error", err.Error())
		_ = msg.Term() // terminal ack — don't retry garbage
		return
	}

	// Extract trace context from NATS headers
	headers := natsHeadersToMap(msg)
	msgCtx := ExtractTraceFromHeaders(ctx, headers)

	// Start a consumer span
	msgCtx, span := StartConsumerSpan(msgCtx, "process "+env.EventType, env)
	defer span.End()

	meta, _ := msg.Metadata()
	deliveryCount := 1
	if meta != nil {
		deliveryCount = int(meta.NumDelivered)
	}

	log.Debug().
		Str("consumer", w.consumerName).
		Str("event_id", env.EventID).
		Str("event_type", env.EventType).
		Str("tenant_id", env.TenantID).
		Int("delivery", deliveryCount).
		Msg("processing event")

	// Call the handler
	if err := w.handler(msgCtx, env); err != nil {
		span.RecordError(err)

		// Check if this is the last delivery attempt
		if deliveryCount >= w.cfg.MaxDeliver {
			log.Error().Err(err).
				Str("consumer", w.consumerName).
				Str("event_id", env.EventID).
				Int("delivery", deliveryCount).
				Msg("max retries exhausted, sending to DLQ")
			w.sendToDLQ(msgCtx, msg.Data(), "max_retries", err.Error())
			_ = msg.Term() // terminal ack
			return
		}

		// NAK with exponential backoff: 2^(delivery-1) seconds, capped at 60s
		delay := backoffDelay(deliveryCount)
		log.Warn().Err(err).
			Str("consumer", w.consumerName).
			Str("event_id", env.EventID).
			Int("delivery", deliveryCount).
			Dur("retry_delay", delay).
			Msg("handler failed, scheduling retry")
		_ = msg.NakWithDelay(delay)
		return
	}

	// Success — ACK
	_ = msg.Ack()
}

// sendToDLQ publishes the raw message to the dead-letter subject.
func (w *ConsumerWorker) sendToDLQ(ctx context.Context, data []byte, reason, errMsg string) {
	dlqEnv := map[string]any{
		"original_subject": w.subject,
		"consumer":         w.consumerName,
		"reason":           reason,
		"error":            errMsg,
		"failed_at":        time.Now().UTC(),
		"original_data":    string(data),
	}

	dlqData, _ := marshalJSON(dlqEnv)

	_, err := w.js.Publish(ctx, w.dlqSubject, dlqData)
	if err != nil {
		log.Error().Err(err).
			Str("dlq_subject", w.dlqSubject).
			Msg("failed to publish to DLQ")
	}
}

// backoffDelay returns exponential backoff: 2^(attempt-1) seconds, capped at 60s.
func backoffDelay(attempt int) time.Duration {
	d := time.Duration(1<<uint(attempt-1)) * time.Second
	if d > 60*time.Second {
		d = 60 * time.Second
	}
	return d
}

// deriveDLQSubject converts "cashflow.X.Y" → "cashflow.dlq.X.Y"
func deriveDLQSubject(subject string) string {
	parts := strings.SplitN(subject, ".", 2)
	if len(parts) < 2 {
		return "cashflow.dlq." + subject
	}
	return parts[0] + ".dlq." + parts[1]
}

// natsHeadersToMap extracts NATS message headers into a flat map.
func natsHeadersToMap(msg jetstream.Msg) map[string]string {
	h := make(map[string]string)
	if msg.Headers() != nil {
		for k, v := range msg.Headers() {
			if len(v) > 0 {
				h[k] = v[0]
			}
		}
	}
	return h
}

func marshalJSON(v any) ([]byte, error) {
	return json.Marshal(v)
}
