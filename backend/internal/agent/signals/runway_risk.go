package signals

import (
	"context"
	"fmt"

	"github.com/finch-co/cashflow/internal/agent/models"
)

// RunwayRiskDetector detects when cash runway is below thresholds
type RunwayRiskDetector struct{}

func NewRunwayRiskDetector() *RunwayRiskDetector {
	return &RunwayRiskDetector{}
}

func (d *RunwayRiskDetector) Detect(ctx context.Context, input DetectionInput) ([]models.CreateSignalInput, error) {
	signals := []models.CreateSignalInput{}

	if input.Forecast == nil || len(input.Forecast.Forecast) == 0 {
		return signals, nil
	}

	currentCash := input.Forecast.Metrics.CurrentCash
	avgDailyOutflow := input.Forecast.Metrics.AvgDailyOutflow

	if avgDailyOutflow <= 0 {
		return signals, nil
	}

	runwayDays := currentCash / avgDailyOutflow

	var severity string
	var threshold int

	switch {
	case runwayDays < 30:
		severity = models.SeverityCritical
		threshold = 30
	case runwayDays < 60:
		severity = models.SeverityHigh
		threshold = 60
	case runwayDays < 90:
		severity = models.SeverityMedium
		threshold = 90
	case runwayDays < 120:
		severity = models.SeverityLow
		threshold = 120
	default:
		return signals, nil
	}

	title := fmt.Sprintf("Cash runway below %d days", threshold)
	description := fmt.Sprintf("Current runway is %.0f days based on average daily burn of %.2f", 
		runwayDays, avgDailyOutflow)

	signal := models.CreateSignalInput{
		TenantID:    input.TenantID,
		SignalType:  models.SignalTypeRunwayRisk,
		Severity:    severity,
		Title:       title,
		Description: description,
		Data: map[string]interface{}{
			"runway_days":      runwayDays,
			"current_cash":     currentCash,
			"avg_daily_burn":   avgDailyOutflow,
			"threshold":        threshold,
		},
	}

	signals = append(signals, signal)
	return signals, nil
}
