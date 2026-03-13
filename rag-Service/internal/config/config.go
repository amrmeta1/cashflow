package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	// Server
	ServerHost string
	ServerPort string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// AI Providers
	AnthropicAPIKey string
	VoyageAPIKey    string
	OpenAIAPIKey    string

	// Embedding Provider
	EmbeddingProvider string // "voyage" (default) or "openai"

	// RAG settings
	ChunkSize    int
	ChunkOverlap int
	TopK         int
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if it exists (ignore error if not found)
	_ = godotenv.Load()

	cfg := &Config{
		ServerHost: getEnv("SERVER_HOST", "0.0.0.0"),
		ServerPort: getEnv("SERVER_PORT", "8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "financial_rag"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		AnthropicAPIKey:   getEnv("ANTHROPIC_API_KEY", ""),
		VoyageAPIKey:      getEnv("VOYAGE_API_KEY", ""),
		OpenAIAPIKey:      getEnv("OPENAI_API_KEY", ""),
		EmbeddingProvider: getEnv("EMBEDDING_PROVIDER", "voyage"),

		ChunkSize:    getEnvInt("CHUNK_SIZE", 800),
		ChunkOverlap: getEnvInt("CHUNK_OVERLAP", 100),
		TopK:         getEnvInt("TOP_K", 5),
	}

	// Check LLM provider - only require Anthropic key if not using OpenAI
	llmProvider := getEnv("LLM_PROVIDER", "claude")
	if llmProvider != "openai" && cfg.AnthropicAPIKey == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY is required when LLM_PROVIDER is not 'openai'")
	}

	// Check embedding provider - require appropriate API key
	switch cfg.EmbeddingProvider {
	case "openai":
		if cfg.OpenAIAPIKey == "" {
			return nil, fmt.Errorf("OPENAI_API_KEY is required when EMBEDDING_PROVIDER is 'openai'")
		}
	case "voyage", "":
		if cfg.VoyageAPIKey == "" {
			return nil, fmt.Errorf("VOYAGE_API_KEY is required when EMBEDDING_PROVIDER is 'voyage' or not set")
		}
	default:
		return nil, fmt.Errorf("invalid EMBEDDING_PROVIDER: %s (must be 'voyage' or 'openai')", cfg.EmbeddingProvider)
	}

	return cfg, nil
}

// DSN returns the PostgreSQL connection string
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode,
	)
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	var n int
	fmt.Sscanf(val, "%d", &n)
	if n == 0 {
		return defaultVal
	}
	return n
}
