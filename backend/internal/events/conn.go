package events

import (
	"context"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/config"
)

// Connect establishes a NATS connection and returns both the raw connection
// and a JetStream context. It provisions all required streams on startup.
func Connect(ctx context.Context, cfg config.NATSConfig) (*nats.Conn, jetstream.JetStream, error) {
	nc, err := nats.Connect(
		cfg.URL,
		nats.MaxReconnects(cfg.MaxReconnects),
		nats.ReconnectWait(time.Duration(cfg.ReconnectWait)*time.Second),
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			log.Warn().Err(err).Msg("nats: disconnected")
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			log.Info().Str("url", nc.ConnectedUrl()).Msg("nats: reconnected")
		}),
		nats.ClosedHandler(func(_ *nats.Conn) {
			log.Info().Msg("nats: connection closed")
		}),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("nats connect: %w", err)
	}

	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		return nil, nil, fmt.Errorf("jetstream init: %w", err)
	}

	// Provision streams
	for _, sc := range StreamConfigs(cfg.MaxDeliver) {
		_, err := js.CreateOrUpdateStream(ctx, sc)
		if err != nil {
			nc.Close()
			return nil, nil, fmt.Errorf("provisioning stream %s: %w", sc.Name, err)
		}
		log.Info().Str("stream", sc.Name).Strs("subjects", sc.Subjects).Msg("nats: stream ready")
	}

	return nc, js, nil
}
