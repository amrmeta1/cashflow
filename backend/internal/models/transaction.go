package models

import (
	"context"

	"github.com/google/uuid"
)

type CashSummary struct {
	TotalInflow     float64
	TotalOutflow    float64
	AvgDailyInflow  float64
	AvgDailyOutflow float64
}

type TransactionRepository interface {
	GetCurrentCash(ctx context.Context, tenantID uuid.UUID) (float64, error)
	GetLastNDaysSummary(ctx context.Context, tenantID uuid.UUID, days int) (*CashSummary, error)
}
