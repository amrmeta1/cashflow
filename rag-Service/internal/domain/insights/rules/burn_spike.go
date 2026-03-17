package rules

import (
	"fmt"
	"math"
	"sort"
	"time"

	"tadfuq/rag-service/internal/domain/insights/types"
)

// ─── Thresholds ──────────────────────────────────────────────────────────────

const (
	// BurnSpikeStddevMultiple: flag if most-recent week > mean + N*σ of prior weeks.
	BurnSpikeStddevMultiple = 1.5

	// BurnTrendWeeks: number of consecutive increasing-burn weeks to flag a trend.
	BurnTrendWeeks = 3

	// burnSpikeLookback: how many weeks of history to include (including current).
	burnSpikeLookback = 8
)

// AnalyzeBurnSpike implements Rule 2.
//
// Logic:
//  1. Group debit (outflow) totals by ISO week for the last `burnSpikeLookback` weeks.
//  2. Compute mean and standard deviation of prior weeks (excluding the current week).
//  3. If the most recent week's outflow exceeds mean + BurnSpikeStddevMultiple*σ → SPIKE.
//  4. Detect an upward burn TREND if the last `BurnTrendWeeks` consecutive weeks each
//     showed higher outflow than the one before.
func AnalyzeBurnSpike(
	txns []types.BankTransaction,
	asOf time.Time,
) []types.Risk {

	if len(txns) == 0 {
		return nil
	}

	cutoff := asOf.AddDate(0, 0, -burnSpikeLookback*7)
	weeklyOut := weeklyOutflowMap(txns, cutoff, asOf)

	if len(weeklyOut) < 2 {
		return nil // need at least 2 weeks to compare
	}

	// Sort weeks chronologically
	weeks := sortedWeekKeys(weeklyOut)
	currentWeek := weeks[len(weeks)-1]
	currentBurn := weeklyOut[currentWeek]

	// Prior weeks (exclude current)
	priorValues := make([]float64, 0, len(weeks)-1)
	for _, w := range weeks[:len(weeks)-1] {
		priorValues = append(priorValues, weeklyOut[w])
	}

	priorMean := mean(priorValues)
	priorStd := stddev(priorValues)
	threshold := priorMean + BurnSpikeStddevMultiple*priorStd
	changeVsPrior := pct(currentBurn-priorMean, priorMean)

	var risks []types.Risk

	// ── Spike detection ───────────────────────────────────────────────────────
	if currentBurn > threshold && priorMean > 0 {
		sev := types.SeverityHigh
		if currentBurn > priorMean+3*priorStd {
			sev = types.SeverityCritical
		}
		risks = append(risks, types.Risk{
			ID:       types.RiskBurnSpike,
			Severity: sev,
			Title:    "Abnormal Burn Spike Detected",
			Message: fmt.Sprintf(
				"This week's outflow (%.0f) is %.1f%% above the %d-week average of %.0f "+
					"(threshold: %.0f at %.1fσ above mean).",
				currentBurn, changeVsPrior, burnSpikeLookback-1,
				priorMean, threshold, BurnSpikeStddevMultiple,
			),
			Data: map[string]any{
				"current_week":      currentWeek,
				"current_burn":      math.Round(currentBurn*100) / 100,
				"prior_mean":        math.Round(priorMean*100) / 100,
				"prior_stddev":      math.Round(priorStd*100) / 100,
				"spike_threshold":   math.Round(threshold*100) / 100,
				"pct_above_average": math.Round(changeVsPrior*10) / 10,
				"weeks_analyzed":    len(weeks),
			},
		})
	}

	// ── Trend detection ───────────────────────────────────────────────────────
	if len(weeks) >= BurnTrendWeeks {
		tail := weeks[len(weeks)-BurnTrendWeeks:]
		trendUp := true
		for i := 1; i < len(tail); i++ {
			if weeklyOut[tail[i]] <= weeklyOut[tail[i-1]] {
				trendUp = false
				break
			}
		}
		if trendUp {
			firstVal := weeklyOut[tail[0]]
			lastVal := weeklyOut[tail[len(tail)-1]]
			totalIncrease := pct(lastVal-firstVal, firstVal)
			risks = append(risks, types.Risk{
				ID:       types.RiskBurnTrend,
				Severity: types.SeverityMedium,
				Title:    fmt.Sprintf("Burn Rate Rising for %d Consecutive Weeks", BurnTrendWeeks),
				Message: fmt.Sprintf(
					"Outflow has increased each of the last %d weeks, growing %.1f%% "+
						"from %.0f to %.0f.",
					BurnTrendWeeks, totalIncrease, firstVal, lastVal,
				),
				Data: map[string]any{
					"trend_weeks":        BurnTrendWeeks,
					"week_start_burn":    math.Round(firstVal*100) / 100,
					"week_end_burn":      math.Round(lastVal*100) / 100,
					"total_increase_pct": math.Round(totalIncrease*10) / 10,
					"weeks":              tail,
				},
			})
		}
	}

	return risks
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// sortedWeekKeys returns the ISO-week keys in chronological order.
func sortedWeekKeys(m map[string]float64) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys) // ISO week strings sort lexicographically = chronologically
	return keys
}

// pct computes percentage change: (delta / base) * 100. Returns 0 if base == 0.
func pct(delta, base float64) float64 {
	if base == 0 {
		return 0
	}
	return (delta / base) * 100
}
