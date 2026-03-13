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
	// BatchingMinPayments: need at least this many separate payments to a vendor
	// within a period before suggesting batching.
	BatchingMinPayments = 3

	// BatchingWindowDays: look for multiple small payments within this window.
	BatchingWindowDays = 14

	// ConflictMinLowBalanceDays: flag a vendor whose payments fall on days when
	// the running balance is within this multiple of the weekly burn rate.
	ConflictLowBalanceRatio = 1.5

	// VendorLookbackDays: history window for vendor analysis.
	vendorLookbackDays = 90

	// MinVendorPayments: a vendor must appear at least this many times to analyse.
	minVendorPayments = 2
)

// AnalyzeVendorPayments implements Rule 5.
//
// Logic — two sub-rules:
//
//	A. BATCHING: Identify vendors that receive multiple small payments within
//	   BatchingWindowDays. Batching them into one payment reduces bank fees and
//	   admin overhead.
//	B. RESCHEDULING: Identify vendor payments that were executed when the running
//	   balance was dangerously low (< ConflictLowBalanceRatio × avgWeeklyBurn).
//	   Suggest moving those payments to higher-balance periods.
func AnalyzeVendorPayments(
	txns []types.BankTransaction,
	forecast []types.ForecastEntry,
	asOf time.Time,
) []types.Opportunity {

	if len(txns) == 0 {
		return nil
	}

	cutoff := asOf.AddDate(0, 0, -vendorLookbackDays)

	// Filter to vendor debits within the lookback window
	var debits []types.BankTransaction
	for _, t := range txns {
		if t.Type == types.Debit && !t.Date.Before(cutoff) && !t.Date.After(asOf) {
			debits = append(debits, t)
		}
	}
	if len(debits) == 0 {
		return nil
	}

	// ── A. Batching opportunities ─────────────────────────────────────────────
	batchOpp := detectBatching(debits)

	// ── B. Rescheduling opportunities ─────────────────────────────────────────
	// Compute avgWeeklyBurn from all debits in the window
	weeklyOut := weeklyOutflowMap(debits, cutoff, asOf)
	avgBurn := mean(mapValues(weeklyOut))

	reschedOpp := detectRescheduling(debits, avgBurn, forecast)

	var opps []types.Opportunity
	if batchOpp != nil {
		opps = append(opps, *batchOpp)
	}
	if reschedOpp != nil {
		opps = append(opps, *reschedOpp)
	}
	return opps
}

// detectBatching finds vendors receiving ≥ BatchingMinPayments within BatchingWindowDays.
func detectBatching(debits []types.BankTransaction) *types.Opportunity {
	// Group by normalised vendor name
	byVendor := make(map[string][]types.BankTransaction)
	for _, d := range debits {
		key := normaliseDesc(d.Description)
		byVendor[key] = append(byVendor[key], d)
	}

	type batchCandidate struct {
		vendor      string
		count       int
		totalAmount float64
		periodStart time.Time
		periodEnd   time.Time
	}
	var candidates []batchCandidate

	for vendor, payments := range byVendor {
		if len(payments) < minVendorPayments {
			continue
		}
		// Sort by date
		sort.Slice(payments, func(i, j int) bool {
			return payments[i].Date.Before(payments[j].Date)
		})
		// Sliding window: find max payments in any BatchingWindowDays span
		best := 0
		var bestStart, bestEnd time.Time
		var bestTotal float64
		for i := 0; i < len(payments); i++ {
			count := 1
			var total float64 = payments[i].Amount
			for j := i + 1; j < len(payments); j++ {
				if payments[j].Date.Sub(payments[i].Date).Hours()/24 <= BatchingWindowDays {
					count++
					total += payments[j].Amount
				} else {
					break
				}
			}
			if count > best {
				best = count
				bestTotal = total
				bestStart = payments[i].Date
				bestEnd = payments[i+count-1].Date
			}
		}
		if best >= BatchingMinPayments {
			candidates = append(candidates, batchCandidate{
				vendor:      vendor,
				count:       best,
				totalAmount: bestTotal,
				periodStart: bestStart,
				periodEnd:   bestEnd,
			})
		}
	}

	if len(candidates) == 0 {
		return nil
	}

	// Sort by count desc
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].count > candidates[j].count
	})

	items := make([]map[string]any, len(candidates))
	var totalSavingsProxy float64
	for i, c := range candidates {
		items[i] = map[string]any{
			"vendor":       c.vendor,
			"payments":     c.count,
			"total_amount": math.Round(c.totalAmount*100) / 100,
			"period_start": c.periodStart.Format("2006-01-02"),
			"period_end":   c.periodEnd.Format("2006-01-02"),
		}
		totalSavingsProxy += c.totalAmount
	}

	return &types.Opportunity{
		ID:    types.OpportunityVendorBatching,
		Title: fmt.Sprintf("%d Vendor(s) Eligible for Payment Batching", len(candidates)),
		Message: fmt.Sprintf(
			"%d vendor(s) received %d+ separate payments within a %d-day window. "+
				"Consolidating them can reduce bank fees and simplify reconciliation.",
			len(candidates), BatchingMinPayments, BatchingWindowDays,
		),
		PotentialValue: math.Round(totalSavingsProxy*0.01*100) / 100, // proxy: 1% fee savings
		Data: map[string]any{
			"candidates":      items,
			"batching_window": BatchingWindowDays,
			"min_payments":    BatchingMinPayments,
		},
	}
}

// detectRescheduling flags vendor payments executed during low-balance periods.
func detectRescheduling(
	debits []types.BankTransaction,
	avgBurn float64,
	forecast []types.ForecastEntry,
) *types.Opportunity {

	if avgBurn == 0 {
		return nil
	}
	lowBalanceThreshold := avgBurn * ConflictLowBalanceRatio

	// Group by vendor
	byVendor := make(map[string][]types.BankTransaction)
	for _, d := range debits {
		key := normaliseDesc(d.Description)
		byVendor[key] = append(byVendor[key], d)
	}

	type conflictEntry struct {
		vendor    string
		date      string
		amount    float64
		balanceAt float64
	}
	var conflicts []conflictEntry

	for vendor, payments := range byVendor {
		if len(payments) < minVendorPayments {
			continue
		}
		for _, p := range payments {
			// balance_after is after the debit, so balance_before = balance_after + amount
			balanceBefore := p.BalanceAfter + p.Amount
			if balanceBefore < lowBalanceThreshold {
				conflicts = append(conflicts, conflictEntry{
					vendor:    vendor,
					date:      p.Date.Format("2006-01-02"),
					amount:    p.Amount,
					balanceAt: math.Round(balanceBefore*100) / 100,
				})
			}
		}
	}

	// Also check forecast: find weeks with very low ending balance and flag
	// any vendor payment scheduled close to those weeks
	type forecastConflict struct {
		week          int
		weekStart     string
		endingBalance float64
	}
	var fConflicts []forecastConflict
	for _, fw := range forecast {
		if fw.ForecastedEndingBalance < lowBalanceThreshold {
			fConflicts = append(fConflicts, forecastConflict{
				week:          fw.WeekNumber,
				weekStart:     fw.WeekStartDate.Format("2006-01-02"),
				endingBalance: fw.ForecastedEndingBalance,
			})
		}
	}

	if len(conflicts) == 0 && len(fConflicts) == 0 {
		return nil
	}

	items := make([]map[string]any, len(conflicts))
	for i, c := range conflicts {
		items[i] = map[string]any{
			"vendor":             c.vendor,
			"date":               c.date,
			"amount":             math.Round(c.amount*100) / 100,
			"balance_at_payment": c.balanceAt,
			"threshold":          math.Round(lowBalanceThreshold*100) / 100,
		}
	}

	forecastItems := make([]map[string]any, len(fConflicts))
	for i, f := range fConflicts {
		forecastItems[i] = map[string]any{
			"week_number":    f.week,
			"week_start":     f.weekStart,
			"ending_balance": math.Round(f.endingBalance*100) / 100,
		}
	}

	totalAtRisk := 0.0
	for _, c := range conflicts {
		totalAtRisk += c.amount
	}

	return &types.Opportunity{
		ID:    types.OpportunityVendorRescheduling,
		Title: fmt.Sprintf("%d Payment(s) Executed During Low-Balance Periods", len(conflicts)),
		Message: fmt.Sprintf(
			"%d historical vendor payment(s) totalling %.0f were made when the running "+
				"balance was below the %.0f safety threshold (%.1fx weekly burn). "+
				"Rescheduling to higher-balance periods reduces overdraft risk.",
			len(conflicts), totalAtRisk, lowBalanceThreshold, ConflictLowBalanceRatio,
		),
		PotentialValue: math.Round(totalAtRisk*100) / 100,
		Data: map[string]any{
			"historical_conflicts":  items,
			"forecast_risk_weeks":   forecastItems,
			"low_balance_threshold": math.Round(lowBalanceThreshold*100) / 100,
			"avg_weekly_burn":       math.Round(avgBurn*100) / 100,
		},
	}
}
