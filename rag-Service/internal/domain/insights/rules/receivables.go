package rules

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"tadfuq/rag-service/internal/domain/insights/types"
)

// ─── Thresholds ──────────────────────────────────────────────────────────────

const (
	// RecurrenceWindowDays: if the same-source inflow hasn't appeared within
	// this many days of its expected recurrence date, flag it as overdue.
	RecurrenceWindowDays = 14

	// MinRecurrenceCount: an inflow pattern must appear at least this many times
	// before it's considered "expected" (avoid false positives on one-offs).
	MinRecurrenceCount = 2

	// MaxIntervalVariancePct: the interval between recurrences must be this
	// consistent (low variance) for a pattern to be trusted.
	MaxIntervalVariancePct = 30.0

	// receivablesLookback: days of transaction history to analyse.
	receivablesLookback = 90
)

// occurrence represents a single transaction occurrence
type occurrence struct {
	date   time.Time
	amount float64
}

// AnalyzeReceivables implements Rule 4.
//
// Logic:
//  1. Identify recurring inflow sources: same description prefix, appearing
//     ≥ MinRecurrenceCount times with a consistent interval.
//  2. Project the next expected date for each pattern.
//  3. If the expected date has passed by > RecurrenceWindowDays and no matching
//     inflow has arrived → flag as overdue receivable.
//  4. Sum the overdue amounts → PotentialValue.
func AnalyzeReceivables(
	txns []types.BankTransaction,
	asOf time.Time,
) []types.Opportunity {

	if len(txns) == 0 {
		return nil
	}

	cutoff := asOf.AddDate(0, 0, -receivablesLookback)

	// Group credits by normalised description prefix
	grouped := make(map[string][]occurrence)
	for _, t := range txns {
		if t.Type != types.Credit {
			continue
		}
		if t.Date.Before(cutoff) || t.Date.After(asOf) {
			continue
		}
		key := normaliseDesc(t.Description)
		grouped[key] = append(grouped[key], occurrence{date: t.Date, amount: t.Amount})
	}

	type overdueEntry struct {
		source       string
		expectedDate time.Time
		avgAmount    float64
		daysOverdue  int
	}
	var overdue []overdueEntry

	for src, occs := range grouped {
		if len(occs) < MinRecurrenceCount {
			continue
		}

		// Sort by date ascending
		sort.Slice(occs, func(i, j int) bool {
			return occs[i].date.Before(occs[j].date)
		})

		// Compute intervals between occurrences (in days)
		intervals := make([]float64, 0, len(occs)-1)
		for i := 1; i < len(occs); i++ {
			intervals = append(intervals, occs[i].date.Sub(occs[i-1].date).Hours()/24)
		}

		avgInterval := mean(intervals)
		if avgInterval <= 0 {
			continue
		}
		stdInterval := stddev(intervals)
		variancePct := pct(stdInterval, avgInterval)

		// Only trust patterns with consistent intervals
		if variancePct > MaxIntervalVariancePct {
			continue
		}

		// Project next expected date from the last occurrence
		last := occs[len(occs)-1]
		expectedDate := last.date.AddDate(0, 0, int(math.Round(avgInterval)))

		// Has it been overdue for more than RecurrenceWindowDays?
		daysOverdue := int(asOf.Sub(expectedDate).Hours() / 24)
		if daysOverdue < RecurrenceWindowDays {
			continue
		}

		// Confirm no matching inflow arrived after last occurrence
		alreadyReceived := false
		for _, t := range txns {
			if t.Type == types.Credit &&
				normaliseDesc(t.Description) == src &&
				t.Date.After(last.date) {
				alreadyReceived = true
				break
			}
		}
		if alreadyReceived {
			continue
		}

		avgAmount := mean(occAmounts(occs))
		overdue = append(overdue, overdueEntry{
			source:       src,
			expectedDate: expectedDate,
			avgAmount:    avgAmount,
			daysOverdue:  daysOverdue,
		})
	}

	if len(overdue) == 0 {
		return nil
	}

	// Sort by days overdue desc
	sort.Slice(overdue, func(i, j int) bool {
		return overdue[i].daysOverdue > overdue[j].daysOverdue
	})

	var totalValue float64
	details := make([]map[string]any, 0, len(overdue))
	for _, o := range overdue {
		totalValue += o.avgAmount
		details = append(details, map[string]any{
			"source":        o.source,
			"expected_date": o.expectedDate.Format("2006-01-02"),
			"days_overdue":  o.daysOverdue,
			"avg_amount":    math.Round(o.avgAmount*100) / 100,
		})
	}

	return []types.Opportunity{{
		ID:    types.OpportunityOverdueReceivables,
		Title: fmt.Sprintf("%d Overdue Recurring Receivable(s)", len(overdue)),
		Message: fmt.Sprintf(
			"%d recurring inflow source(s) are overdue by at least %d days, "+
				"representing an estimated %.0f in uncollected cash.",
			len(overdue), RecurrenceWindowDays, totalValue,
		),
		PotentialValue: math.Round(totalValue*100) / 100,
		Data: map[string]any{
			"overdue_count":     len(overdue),
			"total_potential":   math.Round(totalValue*100) / 100,
			"recurrence_window": RecurrenceWindowDays,
			"items":             details,
		},
	}}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// normaliseDesc extracts a consistent key from a transaction description
// by lowercasing, trimming noise suffixes (dates, IDs, ref numbers).
func normaliseDesc(desc string) string {
	desc = strings.ToLower(strings.TrimSpace(desc))
	// Take only the first 30 chars to group similar descriptions
	if len(desc) > 30 {
		desc = desc[:30]
	}
	return desc
}

func occAmounts(occs []occurrence) []float64 {
	out := make([]float64, len(occs))
	for i, o := range occs {
		out[i] = o.amount
	}
	return out
}
