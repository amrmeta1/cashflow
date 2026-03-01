package mq

import (
	"fmt"
	"time"

	"github.com/rs/zerolog/log"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/finch-co/cashflow/internal/config"
)

// Connect establishes a connection to RabbitMQ and returns the connection and a channel.
func Connect(cfg config.RabbitMQConfig) (*amqp.Connection, *amqp.Channel, error) {
	var conn *amqp.Connection
	var err error

	maxRetries := 10
	delay := time.Duration(cfg.ReconnectDelay) * time.Second

	for i := 0; i < maxRetries; i++ {
		conn, err = amqp.Dial(cfg.URL)
		if err == nil {
			break
		}
		log.Warn().Err(err).Int("attempt", i+1).Msg("rabbitmq connection failed, retrying...")
		time.Sleep(delay)
	}
	if err != nil {
		return nil, nil, fmt.Errorf("connecting to rabbitmq after %d attempts: %w", maxRetries, err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, nil, fmt.Errorf("opening rabbitmq channel: %w", err)
	}

	if err := ch.Qos(cfg.PrefetchCount, 0, false); err != nil {
		ch.Close()
		conn.Close()
		return nil, nil, fmt.Errorf("setting QoS: %w", err)
	}

	// Declare topology
	if err := DeclareTopology(ch, cfg.RetryTTL5s, cfg.RetryTTL30s); err != nil {
		ch.Close()
		conn.Close()
		return nil, nil, fmt.Errorf("declaring topology: %w", err)
	}

	return conn, ch, nil
}
