package engine

import (
	"context"
	"fmt"
	"time"

	"github.com/finch-co/cashflow/internal/agent/models"
	"github.com/finch-co/cashflow/internal/agent/repository"
	"github.com/finch-co/cashflow/internal/agent/signals"
	"github.com/finch-co/cashflow/internal/liquidity"
	coremodels "github.com/finch-co/cashflow/internal/models"
	"github.com/google/uuid"
)

// SignalEngine orchestrates signal detection across all detectors
type SignalEngine struct {
	txnRepo    coremodels.BankTransactionRepository
	signalRepo repository.SignalRepository
	forecastUC *liquidity.ForecastUseCase
	detectors  []signals.SignalDetector
}

// NewSignalEngine creates a new signal engine
func NewSignalEngine(
	txnRepo coremodels.BankTransactionRepository,
	signalRepo repository.SignalRepository,
	forecastUC *liquidity.ForecastUseCase,
) *SignalEngine {
	return &SignalEngine{
		txnRepo:    txnRepo,
		signalRepo: signalRepo,
		forecastUC: forecastUC,
		detectors: []signals.SignalDetector{
			signals.NewRunwayRiskDetector(),
			signals.NewBurnSpikeDetector(),
			signals.NewRevenueDropDetector(),
			signals.NewVendorConcentrationDetector(),
			signals.NewReceivableDelayDetector(),
			signals.NewLiquidityGapDetector(),
		},
	}
}

// Run executes the signal detection pipeline for a tenant
func (e *SignalEngine) Run(ctx context.Context, tenantID uuid.UUID) (*models.SignalResult, error) {
	// 1. Load last 90 days of transactions
	transactions, err := e.loadTransactions(ctx, tenantID, 90)
	if err != nil {
		return nil, fmt.Errorf("loading transactions: %w", err)
	}

	// 2. Generate latest forecast
	forecast, err := e.forecastUC.GenerateForecast(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("generating forecast: %w", err)
	}

	// 3. Build detection input
	input := signals.DetectionInput{
		TenantID:     tenantID,
		Transactions: transactions,
		Forecast:     forecast,
	}

	// 4. Run all detectors
	allSignalInputs := []models.CreateSignalInput{}
	for _, detector := range e.detectors {
		signalInputs, err := detector.Detect(ctx, input)
		if err != nil {
			// Log error but continue with other detectors
			continue
		}
		allSignalInputs = append(allSignalInputs, signalInputs...)
	}

	// 5. Store signals with deduplication
	createdSignals := []models.Signal{}
	for _, signalInput := range allSignalInputs {
		signal, err := e.signalRepo.UpsertSignal(ctx, signalInput)
		if err != nil {
			// Log error but continue
			continue
		}
		createdSignals = append(createdSignals, *signal)
	}

	// 6. Build result
	result := models.BuildSignalResult(tenantID, createdSignals)
	result.GeneratedAt = time.Now()

	return result, nil
}

// GetSignals retrieves stored signals for a tenant
func (e *SignalEngine) GetSignals(ctx context.Context, tenantID uuid.UUID, status string) (*models.SignalResult, error) {
	signals, err := e.signalRepo.ListByTenant(ctx, tenantID, status)
	if err != nil {
		return nil, fmt.Errorf("listing signals: %w", err)
	}

	result := models.BuildSignalResult(tenantID, signals)
	return result, nil
}

// loadTransactions loads the last N days of transactions for a tenant
func (e *SignalEngine) loadTransactions(ctx context.Context, tenantID uuid.UUID, days int) ([]coremodels.BankTransaction, error) {
	to := time.Now()
	from := to.AddDate(0, 0, -days)

	filter := coremodels.TransactionFilter{
		TenantID: tenantID,
		From:     &from,
		To:       &to,
		Limit:    10000, // Reasonable limit
		Offset:   0,
	}

	transactions, _, err := e.txnRepo.List(ctx, filter)
	if err != nil {
		return nil, err
	}

	return transactions, nil
}
