package insights

import (
	"context"
	"fmt"
	"sort"
	"time"

	"tadfuq/rag-service/internal/domain/insights/rules"
	"tadfuq/rag-service/internal/domain/insights/types"

	"github.com/google/uuid"
)

// lookbackDays is the default history window for transaction queries.
const lookbackDays = 90

type service struct {
	repo InsightsRepository
}

// NewService constructs the deterministic InsightsService.
// No LLM dependency. No RAG dependency.
func NewService(repo InsightsRepository) InsightsService {
	return &service{repo: repo}
}

// Run executes the full deterministic insights pipeline:
//  1. Fetch bank_transactions, forecast_entries, alerts.
//  2. Run all 5 rules (pure functions).
//  3. Derive prioritised recommendations from the outputs.
//  4. Return InsightResult.
func (s *service) Run(ctx context.Context, tenantID uuid.UUID) (*InsightResult, error) {
	asOf := time.Now().UTC()
	from := asOf.AddDate(0, 0, -lookbackDays)

	// ── 1. Fetch data ─────────────────────────────────────────────────────────
	txns, err := s.repo.GetTransactions(ctx, tenantID, from, asOf)
	if err != nil {
		return nil, fmt.Errorf("insights.Run: GetTransactions: %w", err)
	}

	forecast, err := s.repo.GetLatestForecast(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("insights.Run: GetLatestForecast: %w", err)
	}

	// GetActiveAlerts is best-effort; don't fail if unavailable
	activeAlerts, _ := s.repo.GetActiveAlerts(ctx, tenantID)

	// ── 2. Run all five rules (pure functions — no I/O) ───────────────────────
	// Convert to types package format for rules
	typesTxns := convertToTypesTransactions(txns)
	typesForecast := convertToTypesForecast(forecast)

	var allRisks []Risk

	// Rule 1: Liquidity Risk
	allRisks = append(allRisks,
		convertTypesRisks(rules.AnalyzeLiquidityRisk(typesTxns, typesForecast, asOf))...)

	// Rule 2: Burn Spike
	allRisks = append(allRisks,
		convertTypesRisks(rules.AnalyzeBurnSpike(typesTxns, asOf))...)

	// Rule 3: Revenue Drop
	allRisks = append(allRisks,
		convertTypesRisks(rules.AnalyzeRevenueDrop(typesTxns, typesForecast, asOf))...)

	// Active alerts → convert to Risk objects (pass-through, no duplication logic)
	for _, a := range activeAlerts {
		allRisks = append(allRisks, Risk{
			ID:       RiskID("ALERT_" + a.AlertType),
			Severity: a.Severity,
			Title:    a.Title,
			Message:  a.Message,
			Data:     a.Details,
		})
	}

	// Rule 4: Receivables Opportunity
	opps := convertTypesOpportunities(rules.AnalyzeReceivables(typesTxns, asOf))

	// Rule 5: Vendor Payment Optimisation
	opps = append(opps,
		convertTypesOpportunities(rules.AnalyzeVendorPayments(typesTxns, typesForecast, asOf))...)

	// ── 3. Sort risks by severity (CRITICAL first) ────────────────────────────
	sortRisks(allRisks)

	// ── 4. Derive recommendations ─────────────────────────────────────────────
	recs := deriveRecommendations(allRisks, opps)

	// ── 5. Build data range ───────────────────────────────────────────────────
	dataFrom := from
	if len(txns) > 0 {
		earliest := txns[len(txns)-1].Date // txns sorted desc, so last = oldest
		if earliest.After(from) {
			dataFrom = earliest
		}
	}

	return &InsightResult{
		TenantID:    tenantID,
		GeneratedAt: asOf,
		DataRange: DateRange{
			From: dataFrom,
			To:   asOf,
		},
		Risks:           allRisks,
		Opportunities:   opps,
		Recommendations: recs,
	}, nil
}

// ─── Recommendation derivation (deterministic priority matrix) ───────────────

func deriveRecommendations(risks []Risk, opps []Opportunity) []Recommendation {
	var recs []Recommendation
	prio := 1

	// Priority order mirrors severity order: CRITICAL risks first, then HIGH,
	// then opportunities (positive action), then MEDIUM risks.

	for _, r := range risks {
		if r.Severity != SeverityCritical {
			continue
		}
		recs = append(recs, recFromRisk(r, prio))
		prio++
	}
	for _, r := range risks {
		if r.Severity != SeverityHigh {
			continue
		}
		recs = append(recs, recFromRisk(r, prio))
		prio++
	}
	// Receivables opportunity is high-value: collect cash before spending
	for _, o := range opps {
		if o.ID == OpportunityOverdueReceivables {
			recs = append(recs, Recommendation{
				Priority:  prio,
				Action:    fmt.Sprintf("Collect overdue receivables (est. %.0f)", o.PotentialValue),
				Rationale: o.Message,
				Data:      o.Data,
			})
			prio++
		}
	}
	for _, r := range risks {
		if r.Severity != SeverityMedium {
			continue
		}
		recs = append(recs, recFromRisk(r, prio))
		prio++
	}
	// Vendor optimisation last (efficiency, not urgent)
	for _, o := range opps {
		if o.ID == OpportunityVendorBatching || o.ID == OpportunityVendorRescheduling {
			recs = append(recs, Recommendation{
				Priority:  prio,
				Action:    o.Title,
				Rationale: o.Message,
				Data:      o.Data,
			})
			prio++
		}
	}

	return recs
}

func recFromRisk(r Risk, priority int) Recommendation {
	return Recommendation{
		Priority:   priority,
		Action:     actionFor(r.ID),
		Rationale:  r.Message,
		LinkedRisk: r.ID,
		Data:       r.Data,
	}
}

func actionFor(id RiskID) string {
	switch id {
	case RiskLiquidityRunway:
		return "Secure short-term credit line or accelerate receivables collection"
	case RiskNegativeForecast:
		return "Review and reduce forecasted outflows for flagged weeks"
	case RiskBurnSpike:
		return "Identify and justify the source of the abnormal outflow spike"
	case RiskBurnTrend:
		return "Audit operating expenses — implement cost controls to reverse burn trend"
	case RiskRevenueDrop:
		return "Investigate revenue decline — review sales pipeline and customer payments"
	case RiskRevenueMiss:
		return "Validate forecast assumptions — check for delayed invoicing or lost deals"
	default:
		return fmt.Sprintf("Investigate and resolve: %s", id)
	}
}

// sortRisks orders risks: CRITICAL > HIGH > MEDIUM > LOW > INFO.
func sortRisks(risks []Risk) {
	order := map[AlertSeverity]int{
		SeverityCritical: 0,
		SeverityHigh:     1,
		SeverityMedium:   2,
		SeverityLow:      3,
		SeverityInfo:     4,
	}
	sort.SliceStable(risks, func(i, j int) bool {
		return order[risks[i].Severity] < order[risks[j].Severity]
	})
}

func severityRank(s AlertSeverity) int {
	switch s {
	case SeverityCritical:
		return 1
	case SeverityHigh:
		return 2
	case SeverityMedium:
		return 3
	case SeverityLow:
		return 4
	default:
		return 5
	}
}

// convertTypesRisks converts from types.Risk to insights.Risk
func convertTypesRisks(trisks []types.Risk) []Risk {
	risks := make([]Risk, len(trisks))
	for i, tr := range trisks {
		risks[i] = Risk{
			ID:       RiskID(tr.ID),
			Severity: AlertSeverity(tr.Severity),
			Title:    tr.Title,
			Message:  tr.Message,
			Data:     tr.Data,
		}
	}
	return risks
}

// convertTypesOpportunities converts from types.Opportunity to insights.Opportunity
func convertTypesOpportunities(topps []types.Opportunity) []Opportunity {
	opps := make([]Opportunity, len(topps))
	for i, to := range topps {
		opps[i] = Opportunity{
			ID:             OpportunityID(to.ID),
			Title:          to.Title,
			Message:        to.Message,
			PotentialValue: to.PotentialValue,
			Data:           to.Data,
		}
	}
	return opps
}

// convertToTypesTransactions converts insights.BankTransaction to types.BankTransaction
func convertToTypesTransactions(txns []BankTransaction) []types.BankTransaction {
	result := make([]types.BankTransaction, len(txns))
	for i, t := range txns {
		result[i] = types.BankTransaction{
			ID:           t.ID.String(),
			Date:         t.Date,
			Description:  t.Description,
			Amount:       t.Amount,
			Type:         types.TransactionType(t.Type),
			BalanceAfter: t.BalanceAfter,
		}
	}
	return result
}

// convertToTypesForecast converts insights.ForecastEntry to types.ForecastEntry
func convertToTypesForecast(forecast []ForecastEntry) []types.ForecastEntry {
	result := make([]types.ForecastEntry, len(forecast))
	for i, f := range forecast {
		result[i] = types.ForecastEntry{
			WeekNumber:              f.WeekNumber,
			WeekStart:               f.WeekStartDate,
			WeekStartDate:           f.WeekStartDate,
			ForecastedEndingBalance: f.ForecastedEndingBalance,
			ForecastedOutflow:       f.ForecastedOutflow,
			ForecastedInflow:        f.ForecastedInflow,
		}
	}
	return result
}
