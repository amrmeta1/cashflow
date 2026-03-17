package signals

import (
	"context"
	"fmt"

	"github.com/finch-co/cashflow/internal/agent/models"
)

// LiquidityGapDetector detects projected negative cash balances in the forecast
type LiquidityGapDetector struct{}

func NewLiquidityGapDetector() *LiquidityGapDetector {
	return &LiquidityGapDetector{}
}

func (d *LiquidityGapDetector) Detect(ctx context.Context, input DetectionInput) ([]models.CreateSignalInput, error) {
	signals := []models.CreateSignalInput{}

	if input.Forecast == nil || len(input.Forecast.Forecast) == 0 {
		return signals, nil
	}

	// Check first 8 weeks of forecast
	maxWeeks := 8
	if len(input.Forecast.Forecast) < maxWeeks {
		maxWeeks = len(input.Forecast.Forecast)
	}

	for i := 0; i < maxWeeks; i++ {
		week := input.Forecast.Forecast[i]
		if week.Baseline < 0 {
			weeksUntilGap := week.WeekNumber

			var severity string
			switch {
			case weeksUntilGap <= 2:
				severity = models.SeverityCritical
			case weeksUntilGap <= 4:
				severity = models.SeverityHigh
			default:
				severity = models.SeverityMedium
			}

			title := fmt.Sprintf("Liquidity gap projected in week %d", week.WeekNumber)
			description := fmt.Sprintf("Forecast shows negative balance of %.2f in %d weeks",
				week.Baseline, weeksUntilGap)

			signal := models.CreateSignalInput{
				TenantID:    input.TenantID,
				SignalType:  models.SignalTypeLiquidityGap,
				Severity:    severity,
				Title:       title,
				Description: description,
				Data: map[string]interface{}{
					"gap_week":           week.WeekNumber,
					"projected_balance":  week.Baseline,
					"weeks_until_gap":    weeksUntilGap,
					"current_cash":       input.Forecast.Metrics.CurrentCash,
				},
			}

			signals = append(signals, signal)
			break // Only report the first gap
		}
	}

	return signals, nil
}
