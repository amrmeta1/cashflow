package analysis

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
)

// UseCase runs financial analysis on tenant transactions and generates Arabic recommendations.
// This package is a bounded context for the ingestion service; it can be extracted
// into a separate service later with minimal change.
type UseCase struct {
	repo domain.AnalysisRepository
}

// NewUseCase returns a UseCase that uses the given repository.
func NewUseCase(repo domain.AnalysisRepository) *UseCase {
	return &UseCase{repo: repo}
}

// RunAnalysis loads transactions, runs all analysis steps, computes health score, saves and returns the analysis.
func (uc *UseCase) RunAnalysis(ctx context.Context, tenantID uuid.UUID) (*domain.CashAnalysis, error) {
	txns, err := uc.repo.GetTransactionsForAnalysis(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("get transactions: %w", err)
	}

	liquidity, liquidityScore := analyzeLiquidity(txns)
	expenseBreakdown, expenseScore := analyzeExpenses(txns)
	recurring := analyzeRecurring(txns)
	collection, collectionScore := analyzeCollection(txns)
	recommendations := generateRecommendations(liquidity, expenseBreakdown, collection, recurring)

	healthScore := int(math.Round(liquidityScore*0.4 + collectionScore*0.3 + expenseScore*0.3))
	if healthScore < 0 {
		healthScore = 0
	}
	if healthScore > 100 {
		healthScore = 100
	}

	now := time.Now()
	analysis := &domain.CashAnalysis{
		TenantID:          tenantID,
		AnalyzedAt:        now,
		HealthScore:       healthScore,
		RiskLevel:         liquidity.RiskLevel,
		RunwayDays:        liquidity.RunwayDays,
		Liquidity:         liquidity,
		ExpenseBreakdown:  expenseBreakdown,
		RecurringPayments: recurring,
		CollectionHealth:  collection,
		Recommendations:   recommendations,
		TransactionCount:  len(txns),
	}

	if err := uc.repo.Save(ctx, analysis); err != nil {
		return nil, fmt.Errorf("save analysis: %w", err)
	}
	return analysis, nil
}

func analyzeLiquidity(txns []domain.TransactionForAnalysis) (domain.LiquidityAnalysis, float64) {
	out := domain.LiquidityAnalysis{RiskLevel: domain.RiskLevelHealthy}
	if len(txns) == 0 {
		return out, 100
	}

	cutoff := time.Now().AddDate(0, 0, -30)
	var totalOutflow float64
	for _, t := range txns {
		if t.Date.Before(cutoff) {
			continue
		}
		if t.Amount < 0 {
			totalOutflow += -t.Amount
		}
	}

	out.DailyBurnRate = totalOutflow / 30
	out.CurrentBalance = txns[len(txns)-1].RunningBalance

	if out.DailyBurnRate <= 0 {
		out.RunwayDays = 999
		out.RiskLevel = domain.RiskLevelHealthy
		out.ProjectedZeroDate = time.Time{}
		return out, 100
	}

	out.RunwayDays = int(out.CurrentBalance / out.DailyBurnRate)
	if out.RunwayDays < 0 {
		out.RunwayDays = 0
	}
	out.ProjectedZeroDate = time.Now().AddDate(0, 0, out.RunwayDays)

	switch {
	case out.RunwayDays < 15:
		out.RiskLevel = domain.RiskLevelCritical
		return out, 10
	case out.RunwayDays < 30:
		out.RiskLevel = domain.RiskLevelWarning
		return out, 50
	default:
		out.RiskLevel = domain.RiskLevelHealthy
		return out, 100
	}
}

func analyzeExpenses(txns []domain.TransactionForAnalysis) ([]domain.ExpenseBreakdown, float64) {
	byCategory := make(map[string]struct {
		amount float64
		count  int
	})
	var totalOutflow float64
	for _, t := range txns {
		if t.Amount >= 0 {
			continue
		}
		abs := -t.Amount
		totalOutflow += abs
		entry := byCategory[t.Category]
		entry.amount += abs
		entry.count++
		byCategory[t.Category] = entry
	}

	if totalOutflow == 0 {
		return nil, 100
	}

	var out []domain.ExpenseBreakdown
	hasDominant := false
	for cat, e := range byCategory {
		pct := (e.amount / totalOutflow) * 100
		dominant := pct > 50
		if dominant {
			hasDominant = true
		}
		out = append(out, domain.ExpenseBreakdown{
			Category:   cat,
			Amount:     e.amount,
			Percentage: pct,
			Count:      e.count,
			IsDominant: dominant,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Amount > out[j].Amount })

	expenseScore := 100.0
	if hasDominant {
		expenseScore = 40
	}
	return out, expenseScore
}

func analyzeRecurring(txns []domain.TransactionForAnalysis) []domain.RecurringPayment {
	byCounterparty := make(map[string][]domain.TransactionForAnalysis)
	for _, t := range txns {
		if t.Counterparty == "" {
			continue
		}
		byCounterparty[t.Counterparty] = append(byCounterparty[t.Counterparty], t)
	}

	var out []domain.RecurringPayment
	for cp, list := range byCounterparty {
		if len(list) < 3 {
			continue
		}
		sort.Slice(list, func(i, j int) bool { return list[i].Date.Before(list[j].Date) })
		var sumAmount float64
		for _, t := range list {
			if t.Amount < 0 {
				sumAmount += -t.Amount
			} else {
				sumAmount += t.Amount
			}
		}
		avgAmount := sumAmount / float64(len(list))
		last := list[len(list)-1].Date
		nextExpected := last.AddDate(0, 0, 30)
		desc := cp
		if len(list) > 0 && list[0].Description != "" {
			desc = list[0].Description
		}
		out = append(out, domain.RecurringPayment{
			Description:  desc,
			Counterparty: cp,
			Amount:       avgAmount,
			Frequency:    "monthly",
			Count:        len(list),
			TotalPerYear: avgAmount * 12,
			NextExpected: nextExpected,
		})
	}
	return out
}

func analyzeCollection(txns []domain.TransactionForAnalysis) (domain.CollectionHealth, float64) {
	var inflows []domain.TransactionForAnalysis
	for _, t := range txns {
		if t.Amount > 0 {
			inflows = append(inflows, t)
		}
	}
	sort.Slice(inflows, func(i, j int) bool { return inflows[i].Date.Before(inflows[j].Date) })

	out := domain.CollectionHealth{}
	if len(inflows) == 0 {
		return out, 100
	}
	for _, t := range inflows {
		out.TotalInflow += t.Amount
		out.InflowCount++
	}
	if len(inflows) < 2 {
		out.CollectionScore = 100
		return out, 100
	}

	var gaps []int
	for i := 1; i < len(inflows); i++ {
		days := int(inflows[i].Date.Sub(inflows[i-1].Date).Hours() / 24)
		if days < 0 {
			days = 0
		}
		gaps = append(gaps, days)
	}
	var sumGaps int
	largest := 0
	for _, g := range gaps {
		sumGaps += g
		if g > largest {
			largest = g
		}
	}
	out.AvgDaysBetween = float64(sumGaps) / float64(len(gaps))
	out.LargestGapDays = largest
	out.CollectionScore = 100 - largest*2
	if out.CollectionScore < 0 {
		out.CollectionScore = 0
	}
	out.IsIrregular = largest > 30

	score := float64(out.CollectionScore)
	return out, score
}

func generateRecommendations(
	liquidity domain.LiquidityAnalysis,
	expenseBreakdown []domain.ExpenseBreakdown,
	collection domain.CollectionHealth,
	recurring []domain.RecurringPayment,
) []domain.Recommendation {
	var recs []domain.Recommendation

	if liquidity.RiskLevel == domain.RiskLevelCritical {
		recs = append(recs, domain.Recommendation{
			Priority:    1,
			Title:       "⚠️ خطر سيولة حرج",
			Description: "رصيدك يكفي " + fmt.Sprintf("%d", liquidity.RunwayDays) + " يوم فقط",
			Action:      "ابدأ تحصيل الذمم فوراً",
			Impact:      "high",
		})
	}
	if liquidity.RiskLevel == domain.RiskLevelWarning {
		recs = append(recs, domain.Recommendation{
			Priority:    1,
			Title:       "تحذير: سيولة منخفضة",
			Description: "رصيدك يكفي " + fmt.Sprintf("%d", liquidity.RunwayDays) + " يوم",
			Action:      "راجع المصاريف وسرّع التحصيل",
			Impact:      "high",
		})
	}

	for _, e := range expenseBreakdown {
		if e.IsDominant {
			recs = append(recs, domain.Recommendation{
				Priority:    2,
				Title:       "مصاريف " + e.Category + " مرتفعة",
				Description: e.Category + " تستهلك " + fmt.Sprintf("%.0f", e.Percentage) + "% من مصاريفك",
				Action:      "راجع عقود " + e.Category,
				Impact:      "medium",
			})
			break
		}
	}
	if collection.IsIrregular {
		recs = append(recs, domain.Recommendation{
			Priority:    2,
			Title:       "تحصيل غير منتظم",
			Description: "أطول فترة بدون تحصيل: " + fmt.Sprintf("%d", collection.LargestGapDays) + " يوم",
			Action:      "ضع جدول تحصيل أسبوعي",
			Impact:      "medium",
		})
	}

	if len(recurring) > 0 {
		var totalPerYear float64
		for _, r := range recurring {
			totalPerYear += r.TotalPerYear
		}
		recs = append(recs, domain.Recommendation{
			Priority:    3,
			Title:       fmt.Sprintf("مدفوعات متكررة بـ %.0f ريال سنوياً", totalPerYear),
			Description: "عندك " + fmt.Sprintf("%d", len(recurring)) + " دفعة متكررة",
			Action:      "راجع هذه العقود",
			Impact:      "low",
		})
	}

	return recs
}
