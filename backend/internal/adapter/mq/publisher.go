package mq

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Publisher publishes messages to RabbitMQ exchanges.
type Publisher struct {
	ch      *amqp.Channel
	retries int
}

// NewPublisher creates a new RabbitMQ publisher.
func NewPublisher(ch *amqp.Channel, retries int) *Publisher {
	return &Publisher{ch: ch, retries: retries}
}

// PublishEvent publishes a domain event to the events topic exchange.
func (p *Publisher) PublishEvent(ctx context.Context, routingKey string, envelope *Envelope) error {
	return p.publish(ctx, ExchangeEvents, routingKey, envelope)
}

// PublishCommand publishes a command to the commands direct exchange.
func (p *Publisher) PublishCommand(ctx context.Context, routingKey string, envelope *Envelope) error {
	return p.publish(ctx, ExchangeCommands, routingKey, envelope)
}

func (p *Publisher) publish(ctx context.Context, exchange, routingKey string, envelope *Envelope) error {
	body, err := envelope.Marshal()
	if err != nil {
		return fmt.Errorf("marshalling envelope: %w", err)
	}

	msg := amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now().UTC(),
		MessageId:    envelope.EventID,
		Body:         body,
		Headers: amqp.Table{
			"tenant_id":  envelope.TenantID,
			"event_type": envelope.EventType,
			"trace_id":   envelope.TraceID,
		},
	}

	var lastErr error
	for i := 0; i <= p.retries; i++ {
		lastErr = p.ch.PublishWithContext(ctx, exchange, routingKey, false, false, msg)
		if lastErr == nil {
			log.Debug().
				Str("exchange", exchange).
				Str("routing_key", routingKey).
				Str("event_id", envelope.EventID).
				Str("tenant_id", envelope.TenantID).
				Msg("message published")
			return nil
		}
		log.Warn().Err(lastErr).Int("attempt", i+1).Msg("publish failed, retrying...")
		time.Sleep(time.Duration(100*(i+1)) * time.Millisecond)
	}

	return fmt.Errorf("publishing to %s/%s after %d retries: %w", exchange, routingKey, p.retries, lastErr)
}
