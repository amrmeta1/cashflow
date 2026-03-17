package signals

import (
	"context"

	"github.com/finch-co/cashflow/internal/agent/models"
	coremodels "github.com/finch-co/cashflow/internal/models"
	"github.com/google/uuid"
)

// SignalDetector defines the interface for signal detection rules
type SignalDetector interface {
	Detect(ctx context.Context, input DetectionInput) ([]models.CreateSignalInput, error)
}

// DetectionInput contains all data needed for signal detection
type DetectionInput struct {
	TenantID     uuid.UUID
	Transactions []coremodels.BankTransaction
	Forecast     *coremodels.ForecastResult
}
