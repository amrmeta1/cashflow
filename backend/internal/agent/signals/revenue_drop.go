package signals

import (
	"context"
	"fmt"
	"time"

	"github.com/finch-co/cashflow/internal/agent/models"
)

// RevenueDropDetector detects significant declines in revenue/inflows
type RevenueDropDetector struct{}

func NewRevenueDropDetector() *RevenueDropDetector {
	return &RevenueDropDetector{}
}

func (d *RevenueDropDetector) Detect(ctx context.Context, input DetectionInput) ([]models.CreateSignalInput, error) {
	signals := []models.CreateSignalInput{}

	if len(input.Transactions) == 0 {
		return signals, nil
	}

	now := time.Now()
	last30Days := now.AddDate(0, 0, -30)
	previous30Days := now.AddDate(0, 0, -60)

	var currentRevenue, previousRevenue float64

	for _, txn := range input.Transactions {
		if txn.Amount > 0 { // Inflows only
			if txn.TxnDate.After(last30Days) {
				currentRevenue += txn.Amount
			} else if txn.TxnDate.After(previous30Days) {
				previousRevenue += txn.Amount
			}
		}
	}

	if previousRevenue == 0 {
		return signals, nil
	}

	declinePct := ((previousRevenue - currentRevenue) / previousRevenue) * 100

	if declinePct <= 15 {
		return signals, nil
	}

	var severity string
	switch {
	case declinePct > 40:
		severity = models.SeverityCritical
	case declinePct > 25:
		severity = models.SeverityHigh
	default:
		severity = models.SeverityMedium
	}

	title := fmt.Sprintf("Revenue declined by %.1f%%", declinePct)
	description := fmt.Sprintf("Monthly revenue dropped from %.2f to %.2f over the last 30 days",
		previousRevenue, currentRevenue)

	signal := models.CreateSignalInput{
		TenantID:    input.TenantID,
		SignalType:  models.SignalTypeRevenueDrop,
		Severity:    severity,
		Title:       title,
		Description: description,
		Data: map[string]interface{}{
			"current_revenue":  currentRevenue,
			"previous_revenue": previousRevenue,
			"decline_pct":      declinePct,
			"period_days":      30,
		},
	}

	signals = append(signals, signal)
	return signals, nil
}
