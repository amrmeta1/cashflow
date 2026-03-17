// Package rules contains the five deterministic insight rules for Tadfuq.
// Every function is pure: same inputs → same outputs. No I/O, no LLM.
package rules

import (
	"fmt"
	"math"
	"time"

	"tadfuq/rag-service/internal/domain/insights/types"
)

// ─── Thresholds (change here; do not scatter magic numbers) ─────────────────

const (
	// RunwayCriticalWeeks: fewer than this many weeks of cash → CRITICAL risk.
	RunwayCriticalWeeks = 4.0

	// RunwayHighWeeks: fewer than this → HIGH risk.
	RunwayHighWeeks = 8.0

	// RunwayMediumWeeks: fewer than this → MEDIUM risk.
	RunwayMediumWeeks = 13.0

	// MinReserveMultiple: ending balance < (avgWeeklyBurn * this) is flagged.
	MinReserveMultiple = 2.0

	// lookbackWeeks: how many weeks of transactions to use for burn calculation.
	lookbackWeeks = 4
)

// AnalyzeLiquidityRisk implements Rule 1.
//
// Logic:
//  1. Derive current balance from the most recent transaction's balance_after.
//  2. Compute average weekly outflow over the last `lookbackWeeks` weeks.
//  3. Runway (weeks) = currentBalance / avgWeeklyOutflow.
//  4. Emit CRITICAL / HIGH / MEDIUM risk based on runway thresholds.
//  5. Scan the 13-week forecast for any week where ending_balance < 0 (CRITICAL)
//     or ending_balance < avgWeeklyOutflow * MinReserveMultiple (HIGH).
func AnalyzeLiquidityRisk(
	txns []types.BankTransaction,
	forecast []types.ForecastEntry,
	asOf time.Time,
) []types.Risk {

	if len(txns) == 0 {
		return nil
	}

	// ── 1. Current balance ───────────────────────────────────────────────────
	currentBalance := latestBalance(txns)

	// ── 2. Avg weekly outflow (last N weeks) ─────────────────────────────────
	cutoff := asOf.AddDate(0, 0, -lookbackWeeks*7)
	weeklyOutflows := weeklyOutflowMap(txns, cutoff, asOf)
	avgWeeklyBurn := mean(mapValues(weeklyOutflows))

	if avgWeeklyBurn == 0 {
		return nil // no outflow data → cannot compute runway
	}

	// ── 3. Runway ────────────────────────────────────────────────────────────
	runwayWeeks := currentBalance / avgWeeklyBurn

	var risks []types.Risk

	// ── 4. Runway-based risk ─────────────────────────────────────────────────
	var sev types.AlertSeverity
	var msg string

	switch {
	case runwayWeeks < RunwayCriticalWeeks:
		sev = types.SeverityCritical
		msg = fmt.Sprintf(
			"Critical: only %.1f weeks of runway remaining at current burn rate of %.0f/week.",
			runwayWeeks, avgWeeklyBurn,
		)
	case runwayWeeks < RunwayHighWeeks:
		sev = types.SeverityHigh
		msg = fmt.Sprintf(
			"%.1f weeks of runway at %.0f/week average burn. Action required within 30 days.",
			runwayWeeks, avgWeeklyBurn,
		)
	case runwayWeeks < RunwayMediumWeeks:
		sev = types.SeverityMedium
		msg = fmt.Sprintf(
			"%.1f weeks of runway. Monitor cash position closely over the next quarter.",
			runwayWeeks,
		)
	default:
		sev = types.SeverityInfo
		msg = fmt.Sprintf("%.1f weeks of runway — within healthy range.", runwayWeeks)
	}

	risks = append(risks, types.Risk{
		ID:       types.RiskLiquidityRunway,
		Severity: sev,
		Title:    "Cash Runway",
		Message:  msg,
		Data: map[string]any{
			"current_balance": math.Round(currentBalance*100) / 100,
			"avg_weekly_burn": math.Round(avgWeeklyBurn*100) / 100,
			"runway_weeks":    math.Round(runwayWeeks*10) / 10,
			"lookback_weeks":  lookbackWeeks,
		},
	})

	// ── 5. Forecast scan ────────────────────────────────────────────────────
	minReserve := avgWeeklyBurn * MinReserveMultiple
	for _, fw := range forecast {
		if fw.ForecastedEndingBalance < 0 {
			risks = append(risks, types.Risk{
				ID:       types.RiskNegativeForecast,
				Severity: types.SeverityCritical,
				Title:    fmt.Sprintf("Negative Balance Forecast — Week %d", fw.WeekNumber),
				Message: fmt.Sprintf(
					"Forecast week %d (%s) projects a negative ending balance of %.0f.",
					fw.WeekNumber, fw.WeekStartDate.Format("02 Jan"), fw.ForecastedEndingBalance,
				),
				Data: map[string]any{
					"week_number":               fw.WeekNumber,
					"week_start":                fw.WeekStartDate.Format("2006-01-02"),
					"forecasted_ending_balance": fw.ForecastedEndingBalance,
					"forecasted_outflow":        fw.ForecastedOutflow,
					"forecasted_inflow":         fw.ForecastedInflow,
				},
			})
		} else if fw.ForecastedEndingBalance < minReserve {
			risks = append(risks, types.Risk{
				ID:       types.RiskNegativeForecast,
				Severity: types.SeverityHigh,
				Title:    fmt.Sprintf("Low Reserve Forecast — Week %d", fw.WeekNumber),
				Message: fmt.Sprintf(
					"Week %d ending balance (%.0f) falls below the 2-week reserve of %.0f.",
					fw.WeekNumber, fw.ForecastedEndingBalance, minReserve,
				),
				Data: map[string]any{
					"week_number":               fw.WeekNumber,
					"week_start":                fw.WeekStartDate.Format("2006-01-02"),
					"forecasted_ending_balance": fw.ForecastedEndingBalance,
					"minimum_reserve":           math.Round(minReserve*100) / 100,
				},
			})
		}
	}

	return risks
}

// ─── shared math helpers (used across rule files) ────────────────────────────

// latestBalance returns the balance_after of the most recent transaction
// (txns assumed sorted by date DESC).
func latestBalance(txns []types.BankTransaction) float64 {
	if len(txns) == 0 {
		return 0
	}
	return txns[0].BalanceAfter
}

// weekKey produces an ISO-week string "YYYY-WNN" for grouping.
func weekKey(t time.Time) string {
	y, w := t.ISOWeek()
	return fmt.Sprintf("%d-W%02d", y, w)
}

// weeklyOutflowMap groups debit amounts by ISO week between [from, to].
func weeklyOutflowMap(txns []types.BankTransaction, from, to time.Time) map[string]float64 {
	m := make(map[string]float64)
	for _, t := range txns {
		if t.Type == types.Debit && !t.Date.Before(from) && !t.Date.After(to) {
			m[weekKey(t.Date)] += t.Amount
		}
	}
	return m
}

// weeklyInflowMap groups credit amounts by ISO week between [from, to].
func weeklyInflowMap(txns []types.BankTransaction, from, to time.Time) map[string]float64 {
	m := make(map[string]float64)
	for _, t := range txns {
		if t.Type == types.Credit && !t.Date.Before(from) && !t.Date.After(to) {
			m[weekKey(t.Date)] += t.Amount
		}
	}
	return m
}

func mapValues(m map[string]float64) []float64 {
	out := make([]float64, 0, len(m))
	for _, v := range m {
		out = append(out, v)
	}
	return out
}

func mean(vals []float64) float64 {
	if len(vals) == 0 {
		return 0
	}
	var sum float64
	for _, v := range vals {
		sum += v
	}
	return sum / float64(len(vals))
}

func stddev(vals []float64) float64 {
	if len(vals) < 2 {
		return 0
	}
	m := mean(vals)
	var variance float64
	for _, v := range vals {
		d := v - m
		variance += d * d
	}
	return math.Sqrt(variance / float64(len(vals)))
}
