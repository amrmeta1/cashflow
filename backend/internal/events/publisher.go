package events

import (
	"context"
	"fmt"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/rs/zerolog/log"
)

// Publisher is the shared library for publishing events to NATS JetStream.
// It handles envelope creation, OTel trace injection, and deduplication
// via the Nats-Msg-Id header (idempotency key).
type Publisher struct {
	js jetstream.JetStream
}

// NewPublisher creates a publisher backed by the given JetStream context.
func NewPublisher(js jetstream.JetStream) *Publisher {
	return &Publisher{js: js}
}

// Publish serializes the envelope, injects trace context, sets the
// Nats-Msg-Id header for server-side deduplication, and publishes
// to the given subject with at-least-once delivery guarantee.
func (p *Publisher) Publish(ctx context.Context, subject string, env *Envelope) error {
	// OTel: start a producer span
	ctx, span := StartPublisherSpan(ctx, subject)
	defer span.End()

	// Inject trace IDs into the envelope body
	InjectTrace(ctx, env)

	data, err := env.Marshal()
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}

	// Build NATS message with headers
	msg := &nats.Msg{
		Subject: subject,
		Data:    data,
		Header:  nats.Header{},
	}

	// Server-side deduplication via Nats-Msg-Id
	msg.Header.Set("Nats-Msg-Id", env.IdempotencyKey)

	// Propagate W3C trace context in NATS headers
	for k, v := range PropagateToHeaders(ctx) {
		msg.Header.Set(k, v)
	}

	// Publish with ack (JetStream guarantees at-least-once)
	ack, err := p.js.PublishMsg(ctx, msg)
	if err != nil {
		return fmt.Errorf("publish to %s: %w", subject, err)
	}

	log.Debug().
		Str("subject", subject).
		Str("event_id", env.EventID).
		Str("event_type", env.EventType).
		Str("tenant_id", env.TenantID).
		Uint64("seq", ack.Sequence).
		Str("stream", ack.Stream).
		Msg("event published")

	return nil
}

// PublishNew is a convenience method that creates a new envelope and publishes it.
func (p *Publisher) PublishNew(ctx context.Context, subject, eventType, tenantID string, version int, payload any) error {
	env, err := NewEnvelope(eventType, tenantID, version, payload)
	if err != nil {
		return fmt.Errorf("create envelope: %w", err)
	}
	return p.Publish(ctx, subject, env)
}
