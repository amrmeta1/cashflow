package signals

import (
	"context"
	"fmt"
	"time"

	"github.com/finch-co/cashflow/internal/agent/models"
)

// BurnSpikeDetector detects sudden increases in cash burn rate
type BurnSpikeDetector struct{}

func NewBurnSpikeDetector() *BurnSpikeDetector {
	return &BurnSpikeDetector{}
}

func (d *BurnSpikeDetector) Detect(ctx context.Context, input DetectionInput) ([]models.CreateSignalInput, error) {
	signals := []models.CreateSignalInput{}

	if len(input.Transactions) == 0 {
		return signals, nil
	}

	now := time.Now()
	last30Days := now.AddDate(0, 0, -30)
	previous30Days := now.AddDate(0, 0, -60)

	var currentBurn, previousBurn float64

	for _, txn := range input.Transactions {
		if txn.Amount < 0 { // Outflows only
			if txn.TxnDate.After(last30Days) {
				currentBurn += -txn.Amount
			} else if txn.TxnDate.After(previous30Days) {
				previousBurn += -txn.Amount
			}
		}
	}

	if previousBurn == 0 {
		return signals, nil
	}

	increasePct := ((currentBurn - previousBurn) / previousBurn) * 100

	if increasePct <= 20 {
		return signals, nil
	}

	var severity string
	switch {
	case increasePct > 50:
		severity = models.SeverityCritical
	case increasePct > 35:
		severity = models.SeverityHigh
	default:
		severity = models.SeverityMedium
	}

	title := fmt.Sprintf("Cash burn increased by %.1f%%", increasePct)
	description := fmt.Sprintf("Monthly burn rose from %.2f to %.2f over the last 30 days",
		previousBurn, currentBurn)

	signal := models.CreateSignalInput{
		TenantID:    input.TenantID,
		SignalType:  models.SignalTypeBurnSpike,
		Severity:    severity,
		Title:       title,
		Description: description,
		Data: map[string]interface{}{
			"current_burn":  currentBurn,
			"previous_burn": previousBurn,
			"increase_pct":  increasePct,
			"period_days":   30,
		},
	}

	signals = append(signals, signal)
	return signals, nil
}
