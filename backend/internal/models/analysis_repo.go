package models

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// TransactionForAnalysis is a minimal struct for analysis (read from bank_transactions table).
// Used to avoid name clash with domain.BankTransaction from ingestion.
type TransactionForAnalysis struct {
	Date           time.Time
	Description    string
	Amount         float64 // positive = inflow, negative = outflow
	Category       string
	Counterparty   string
	RunningBalance float64
}

// AnalysisRepository persists and retrieves cash analyses.
type AnalysisRepository interface {
	Save(ctx context.Context, analysis *CashAnalysis) error
	GetLatest(ctx context.Context, tenantID uuid.UUID) (*CashAnalysis, error)
	GetTransactionsForAnalysis(ctx context.Context, tenantID uuid.UUID) ([]TransactionForAnalysis, error)
}
