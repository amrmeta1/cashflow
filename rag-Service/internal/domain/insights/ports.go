package insights

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// InsightsRepository is the only external dependency of the engine.
// It fetches raw data; zero business logic lives here.
type InsightsRepository interface {
	// GetTransactions returns all bank transactions for the tenant in [from, to],
	// ordered by txn_date DESC.
	GetTransactions(ctx context.Context, tenantID uuid.UUID, from, to time.Time) ([]BankTransaction, error)

	// GetLatestForecast returns the most recent 13-week forecast run for the tenant,
	// ordered by week_number ASC.
	GetLatestForecast(ctx context.Context, tenantID uuid.UUID) ([]ForecastEntry, error)

	// GetActiveAlerts returns all unresolved alerts for the tenant,
	// ordered by triggered_at DESC.
	GetActiveAlerts(ctx context.Context, tenantID uuid.UUID) ([]Alert, error)
}

// InsightsService is the primary use-case interface callers invoke.
type InsightsService interface {
	// Run fetches all inputs, executes all 5 deterministic rules,
	// and returns a fully-populated InsightResult.
	// No LLM is called at any point.
	Run(ctx context.Context, tenantID uuid.UUID) (*InsightResult, error)
}
