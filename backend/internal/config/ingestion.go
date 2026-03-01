package config

import "fmt"

// IngestionConfig is the top-level config for the ingestion-service.
type IngestionConfig struct {
	Server   ServerConfig
	Database DatabaseConfig
	Auth     AuthConfig
	RabbitMQ RabbitMQConfig
	OTEL     OTELConfig
}

type RabbitMQConfig struct {
	URL              string `envconfig:"RABBITMQ_URL" default:"amqp://guest:guest@localhost:5672/"`
	ReconnectDelay   int    `envconfig:"RABBITMQ_RECONNECT_DELAY" default:"5"`    // seconds
	PublishRetries   int    `envconfig:"RABBITMQ_PUBLISH_RETRIES" default:"3"`
	PrefetchCount    int    `envconfig:"RABBITMQ_PREFETCH_COUNT" default:"10"`
	RetryTTL5s       int    `envconfig:"RABBITMQ_RETRY_TTL_5S" default:"5000"`    // ms
	RetryTTL30s      int    `envconfig:"RABBITMQ_RETRY_TTL_30S" default:"30000"`  // ms
}

func (r RabbitMQConfig) String() string {
	return fmt.Sprintf("rabbitmq(url=%s, prefetch=%d)", r.URL, r.PrefetchCount)
}

func LoadIngestion() (*IngestionConfig, error) {
	var cfg IngestionConfig
	if err := loadEnvConfig(&cfg); err != nil {
		return nil, fmt.Errorf("loading ingestion config: %w", err)
	}
	return &cfg, nil
}
