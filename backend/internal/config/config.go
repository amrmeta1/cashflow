package config

import (
	"fmt"
	"net/url"

	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Auth     AuthConfig
	NATS     NATSConfig
	OTEL     OTELConfig
}

type ServerConfig struct {
	Host string `envconfig:"SERVER_HOST" default:"0.0.0.0"`
	Port int    `envconfig:"SERVER_PORT" default:"8080"`
}

func (s ServerConfig) Addr() string {
	return fmt.Sprintf("%s:%d", s.Host, s.Port)
}

type DatabaseConfig struct {
	Host     string `envconfig:"DB_HOST" default:"localhost"`
	Port     int    `envconfig:"DB_PORT" default:"5432"`
	User     string `envconfig:"DB_USER" default:"cashflow"`
	Password string `envconfig:"DB_PASSWORD" default:"cashflow"`
	Name     string `envconfig:"DB_NAME" default:"cashflow"`
	SSLMode  string `envconfig:"DB_SSLMODE" default:"disable"`
}

func (d DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		url.QueryEscape(d.User), url.QueryEscape(d.Password), d.Host, d.Port, d.Name, d.SSLMode,
	)
}

type AuthConfig struct {
	// Keycloak OIDC
	IssuerURL string `envconfig:"AUTH_ISSUER_URL" default:"http://localhost:8180/realms/cashflow"`
	JWKSURL   string `envconfig:"AUTH_JWKS_URL" default:"http://localhost:8180/realms/cashflow/protocol/openid-connect/certs"`
	Audience  string `envconfig:"AUTH_AUDIENCE" default:"cashflow-api"`

	// JWKS cache TTL in seconds
	JWKSCacheTTL int `envconfig:"AUTH_JWKS_CACHE_TTL" default:"300"` // 5 min

	// Dev-only: skip JWKS validation (NEVER in production)
	DevMode bool `envconfig:"AUTH_DEV_MODE" default:"false"`
}

type NATSConfig struct {
	URL           string `envconfig:"NATS_URL" default:"nats://localhost:4222"`
	MaxReconnects int    `envconfig:"NATS_MAX_RECONNECTS" default:"10"`
	ReconnectWait int    `envconfig:"NATS_RECONNECT_WAIT" default:"2"` // seconds
	MaxAckPending int    `envconfig:"NATS_MAX_ACK_PENDING" default:"256"`
	MaxDeliver    int    `envconfig:"NATS_MAX_DELIVER" default:"5"` // retries before DLQ
	AckWait       int    `envconfig:"NATS_ACK_WAIT" default:"30"`   // seconds
}

type OTELConfig struct {
	Enabled     bool   `envconfig:"OTEL_ENABLED" default:"false"`
	ExporterURL string `envconfig:"OTEL_EXPORTER_OTLP_ENDPOINT" default:"http://localhost:4318"`
	ServiceName string `envconfig:"OTEL_SERVICE_NAME" default:"cashflow-tenant-service"`
}

func Load() (*Config, error) {
	var cfg Config
	if err := loadEnvConfig(&cfg); err != nil {
		return nil, fmt.Errorf("loading config: %w", err)
	}
	return &cfg, nil
}

func loadEnvConfig(target any) error {
	return envconfig.Process("", target)
}
