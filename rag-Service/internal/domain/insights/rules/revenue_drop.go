package rules

import (
	"fmt"
	"math"
	"time"

	"tadfuq/rag-service/internal/domain/insights/types"
)

// ─── Thresholds ──────────────────────────────────────────────────────────────

const (
	// RevDropHighPct: week-over-average inflow drop that triggers HIGH risk.
	RevDropHighPct = 20.0

	// RevDropMediumPct: week-over-average drop that triggers MEDIUM risk.
	RevDropMediumPct = 10.0

	// RevForecastMissPct: actual inflow below forecast by this % → MEDIUM risk.
	RevForecastMissPct = 15.0

	// revLookbackWeeks: weeks of history used to build the inflow baseline.
	revLookbackWeeks = 5 // last 5 weeks; most recent is the "current" period
)

// AnalyzeRevenueDrop implements Rule 3.
//
// Logic:
//  1. Group credit (inflow) totals by ISO week for the last `revLookbackWeeks` weeks.
//  2. Baseline = mean of prior weeks (all but the most recent).
//  3. Compare the most recent week's inflow to the baseline.
//     Drop ≥ RevDropHighPct   → HIGH risk.
//     Drop ≥ RevDropMediumPct → MEDIUM risk.
//  4. Compare the first forecast week's expected inflow to the same baseline.
//     If forecast inflow is already below baseline by RevForecastMissPct → pre-warn.
func AnalyzeRevenueDrop(
	txns []types.BankTransaction,
	forecast []types.ForecastEntry,
	asOf time.Time,
) []types.Risk {

	if len(txns) == 0 {
		return nil
	}

	cutoff := asOf.AddDate(0, 0, -revLookbackWeeks*7)
	weeklyIn := weeklyInflowMap(txns, cutoff, asOf)

	if len(weeklyIn) < 2 {
		return nil
	}

	weeks := sortedWeekKeys(weeklyIn)
	currentWeek := weeks[len(weeks)-1]
	currentInflow := weeklyIn[currentWeek]

	priorValues := make([]float64, 0, len(weeks)-1)
	for _, w := range weeks[:len(weeks)-1] {
		priorValues = append(priorValues, weeklyIn[w])
	}
	baseline := mean(priorValues)
	if baseline == 0 {
		return nil
	}

	dropPct := pct(baseline-currentInflow, baseline) // positive = drop, negative = growth

	var risks []types.Risk

	// ── Actual inflow drop ────────────────────────────────────────────────────
	switch {
	case dropPct >= RevDropHighPct:
		risks = append(risks, types.Risk{
			ID:       types.RiskRevenueDrop,
			Severity: types.SeverityHigh,
			Title:    "Significant Revenue Drop",
			Message: fmt.Sprintf(
				"Inflow this week (%.0f) is %.1f%% below the %d-week average of %.0f.",
				currentInflow, dropPct, revLookbackWeeks-1, baseline,
			),
			Data: inDropData(currentWeek, currentInflow, baseline, dropPct, revLookbackWeeks),
		})
	case dropPct >= RevDropMediumPct:
		risks = append(risks, types.Risk{
			ID:       types.RiskRevenueDrop,
			Severity: types.SeverityMedium,
			Title:    "Revenue Below Average",
			Message: fmt.Sprintf(
				"Inflow this week (%.0f) is %.1f%% below the %d-week average of %.0f.",
				currentInflow, dropPct, revLookbackWeeks-1, baseline,
			),
			Data: inDropData(currentWeek, currentInflow, baseline, dropPct, revLookbackWeeks),
		})
	}

	// ── Forecast miss pre-warn ────────────────────────────────────────────────
	// Use week-1 of forecast as the near-term revenue signal
	if len(forecast) > 0 {
		fw := forecast[0]
		forecastMissPct := pct(baseline-fw.ForecastedInflow, baseline)
		if forecastMissPct >= RevForecastMissPct {
			risks = append(risks, types.Risk{
				ID:       types.RiskRevenueMiss,
				Severity: types.SeverityMedium,
				Title:    "Forecast Revenue Below Historical Average",
				Message: fmt.Sprintf(
					"Forecast week 1 inflow (%.0f) is %.1f%% below the historical %d-week average of %.0f.",
					fw.ForecastedInflow, forecastMissPct, revLookbackWeeks-1, baseline,
				),
				Data: map[string]any{
					"forecast_week":       fw.WeekNumber,
					"forecast_week_start": fw.WeekStartDate.Format("2006-01-02"),
					"forecasted_inflow":   math.Round(fw.ForecastedInflow*100) / 100,
					"historical_baseline": math.Round(baseline*100) / 100,
					"miss_pct":            math.Round(forecastMissPct*10) / 10,
				},
			})
		}
	}

	return risks
}

func inDropData(week string, current, baseline, dropPct float64, lookback int) map[string]any {
	return map[string]any{
		"current_week":   week,
		"current_inflow": math.Round(current*100) / 100,
		"baseline_avg":   math.Round(baseline*100) / 100,
		"drop_pct":       math.Round(dropPct*10) / 10,
		"lookback_weeks": lookback - 1,
	}
}
