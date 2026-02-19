package config

import (
	"fmt"

	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Auth     AuthConfig
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
		d.User, d.Password, d.Host, d.Port, d.Name, d.SSLMode,
	)
}

type AuthConfig struct {
	// OIDC / Keycloak settings
	IssuerURL string `envconfig:"AUTH_ISSUER_URL" default:"http://localhost:8180/realms/cashflow"`
	Audience  string `envconfig:"AUTH_AUDIENCE" default:"cashflow-api"`

	// Local auth (dev fallback)
	JWTSecret       string `envconfig:"AUTH_JWT_SECRET" default:"dev-secret-change-me-in-production"`
	LocalAuthEnabled bool  `envconfig:"AUTH_LOCAL_ENABLED" default:"true"`

	// Token durations
	AccessTokenTTL  int `envconfig:"AUTH_ACCESS_TOKEN_TTL" default:"900"`    // 15 min
	RefreshTokenTTL int `envconfig:"AUTH_REFRESH_TOKEN_TTL" default:"604800"` // 7 days
}

type OTELConfig struct {
	Enabled      bool   `envconfig:"OTEL_ENABLED" default:"false"`
	ExporterURL  string `envconfig:"OTEL_EXPORTER_OTLP_ENDPOINT" default:"http://localhost:4318"`
	ServiceName  string `envconfig:"OTEL_SERVICE_NAME" default:"cashflow-tenant-service"`
}

func Load() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, fmt.Errorf("loading config: %w", err)
	}
	return &cfg, nil
}
