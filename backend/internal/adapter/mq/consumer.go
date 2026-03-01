package mq

import (
	"context"
	"fmt"

	"github.com/rs/zerolog/log"

	amqp "github.com/rabbitmq/amqp091-go"
)

// MessageHandler processes a single RabbitMQ delivery.
// Return nil to ack, non-nil to nack (message goes to retry/DLQ).
type MessageHandler func(ctx context.Context, env *Envelope) error

// Consumer consumes messages from a RabbitMQ queue.
type Consumer struct {
	ch        *amqp.Channel
	queueName string
	handler   MessageHandler
}

// NewConsumer creates a new RabbitMQ consumer for the given queue.
func NewConsumer(ch *amqp.Channel, queueName string, handler MessageHandler) *Consumer {
	return &Consumer{
		ch:        ch,
		queueName: queueName,
		handler:   handler,
	}
}

// Start begins consuming messages. Blocks until context is cancelled.
func (c *Consumer) Start(ctx context.Context) error {
	deliveries, err := c.ch.Consume(
		c.queueName,
		"",    // consumer tag (auto-generated)
		false, // auto-ack = false (manual ack)
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,
	)
	if err != nil {
		return fmt.Errorf("starting consumer on %s: %w", c.queueName, err)
	}

	log.Info().Str("queue", c.queueName).Msg("consumer started")

	for {
		select {
		case <-ctx.Done():
			log.Info().Str("queue", c.queueName).Msg("consumer stopping")
			return nil
		case d, ok := <-deliveries:
			if !ok {
				return fmt.Errorf("delivery channel closed for %s", c.queueName)
			}
			c.processDelivery(ctx, d)
		}
	}
}

func (c *Consumer) processDelivery(ctx context.Context, d amqp.Delivery) {
	env, err := UnmarshalEnvelope(d.Body)
	if err != nil {
		log.Error().Err(err).Str("queue", c.queueName).Msg("failed to unmarshal envelope, sending to DLQ")
		_ = d.Nack(false, false)
		return
	}

	retryCount := getRetryCount(d.Headers)

	logger := log.With().
		Str("queue", c.queueName).
		Str("event_id", env.EventID).
		Str("event_type", env.EventType).
		Str("tenant_id", env.TenantID).
		Int64("retry", retryCount).
		Logger()

	if err := c.handler(ctx, env); err != nil {
		logger.Error().Err(err).Msg("message processing failed")

		// After 3 retries, messages end up in DLQ via dead-letter chain
		if retryCount >= 3 {
			logger.Warn().Msg("max retries reached, message will go to DLQ")
		}
		_ = d.Nack(false, false) // requeue=false → goes to dead-letter exchange
		return
	}

	logger.Debug().Msg("message processed successfully")
	_ = d.Ack(false)
}

func getRetryCount(headers amqp.Table) int64 {
	if headers == nil {
		return 0
	}
	if xDeath, ok := headers["x-death"].([]interface{}); ok {
		var total int64
		for _, d := range xDeath {
			if dm, ok := d.(amqp.Table); ok {
				if count, ok := dm["count"].(int64); ok {
					total += count
				}
			}
		}
		return total
	}
	return 0
}
