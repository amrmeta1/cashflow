package signals

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/finch-co/cashflow/internal/agent/models"
)

// ReceivableDelayDetector detects increasing delays in receivables/collections
type ReceivableDelayDetector struct{}

func NewReceivableDelayDetector() *ReceivableDelayDetector {
	return &ReceivableDelayDetector{}
}

func (d *ReceivableDelayDetector) Detect(ctx context.Context, input DetectionInput) ([]models.CreateSignalInput, error) {
	signals := []models.CreateSignalInput{}

	if len(input.Transactions) == 0 {
		return signals, nil
	}

	// Collect inflow dates
	var inflowDates []time.Time
	for _, txn := range input.Transactions {
		if txn.Amount > 0 {
			inflowDates = append(inflowDates, txn.TxnDate)
		}
	}

	if len(inflowDates) < 5 {
		return signals, nil // Need sufficient data
	}

	// Sort dates
	sort.Slice(inflowDates, func(i, j int) bool {
		return inflowDates[i].Before(inflowDates[j])
	})

	// Calculate average days between inflows for recent vs historical
	now := time.Now()
	last30Days := now.AddDate(0, 0, -30)
	last90Days := now.AddDate(0, 0, -90)

	var recentGaps, historicalGaps []float64

	for i := 1; i < len(inflowDates); i++ {
		gap := inflowDates[i].Sub(inflowDates[i-1]).Hours() / 24
		if inflowDates[i].After(last30Days) {
			recentGaps = append(recentGaps, gap)
		} else if inflowDates[i].After(last90Days) {
			historicalGaps = append(historicalGaps, gap)
		}
	}

	if len(recentGaps) < 2 || len(historicalGaps) < 2 {
		return signals, nil
	}

	currentAvg := average(recentGaps)
	previousAvg := average(historicalGaps)

	if previousAvg == 0 {
		return signals, nil
	}

	increasePct := ((currentAvg - previousAvg) / previousAvg) * 100

	if increasePct <= 20 {
		return signals, nil
	}

	var severity string
	if increasePct > 40 {
		severity = models.SeverityHigh
	} else {
		severity = models.SeverityMedium
	}

	title := fmt.Sprintf("Collection time increased by %.1f%%", increasePct)
	description := fmt.Sprintf("Average days between collections rose from %.0f to %.0f days",
		previousAvg, currentAvg)

	signal := models.CreateSignalInput{
		TenantID:    input.TenantID,
		SignalType:  models.SignalTypeReceivableDelay,
		Severity:    severity,
		Title:       title,
		Description: description,
		Data: map[string]interface{}{
			"current_avg_days":  currentAvg,
			"previous_avg_days": previousAvg,
			"increase_pct":      increasePct,
			"sample_size":       len(recentGaps),
		},
	}

	signals = append(signals, signal)
	return signals, nil
}

func average(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}
