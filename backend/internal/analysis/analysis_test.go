package analysis

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
)

type fakeAnalysisRepo struct {
	txns []domain.TransactionForAnalysis
	save func(ctx context.Context, analysis *domain.CashAnalysis) error
}

func (f *fakeAnalysisRepo) GetTransactionsForAnalysis(ctx context.Context, tenantID uuid.UUID) ([]domain.TransactionForAnalysis, error) {
	return f.txns, nil
}

func (f *fakeAnalysisRepo) GetLatest(ctx context.Context, tenantID uuid.UUID) (*domain.CashAnalysis, error) {
	return nil, domain.ErrNotFound
}

func (f *fakeAnalysisRepo) Save(ctx context.Context, analysis *domain.CashAnalysis) error {
	if f.save != nil {
		return f.save(ctx, analysis)
	}
	return nil
}

func TestLiquidityAnalysis_Critical(t *testing.T) {
	tenantID := uuid.MustParse("10000000-0000-0000-0000-000000000001")
	now := time.Now()
	var txns []domain.TransactionForAnalysis
	balance := 400000.0
	for i := 0; i < 30; i++ {
		d := now.AddDate(0, 0, -29+i)
		txns = append(txns, domain.TransactionForAnalysis{
			Date:           d,
			Amount:         -10000,
			Category:       "ops",
			RunningBalance: balance - 10000*float64(i+1),
		})
	}
	txns[29].RunningBalance = 100000

	repo := &fakeAnalysisRepo{txns: txns}
	uc := NewUseCase(repo)
	got, err := uc.RunAnalysis(context.Background(), tenantID)
	if err != nil {
		t.Fatalf("RunAnalysis: %v", err)
	}
	if got.RiskLevel != domain.RiskLevelCritical {
		t.Errorf("RiskLevel: got %s, want critical", got.RiskLevel)
	}
	if got.RunwayDays >= 15 {
		t.Errorf("RunwayDays: got %d, want < 15", got.RunwayDays)
	}
}

func TestLiquidityAnalysis_Healthy(t *testing.T) {
	tenantID := uuid.MustParse("10000000-0000-0000-0000-000000000001")
	now := time.Now()
	var txns []domain.TransactionForAnalysis
	for i := 0; i < 30; i++ {
		d := now.AddDate(0, 0, -29+i)
		txns = append(txns, domain.TransactionForAnalysis{
			Date:           d,
			Amount:         -10000,
			Category:       "ops",
			RunningBalance: 1000000 - 10000*float64(30-i),
		})
	}
	txns[29].RunningBalance = 1000000

	repo := &fakeAnalysisRepo{txns: txns}
	uc := NewUseCase(repo)
	got, err := uc.RunAnalysis(context.Background(), tenantID)
	if err != nil {
		t.Fatalf("RunAnalysis: %v", err)
	}
	if got.RiskLevel != domain.RiskLevelHealthy {
		t.Errorf("RiskLevel: got %s, want healthy", got.RiskLevel)
	}
	if got.RunwayDays < 30 {
		t.Errorf("RunwayDays: got %d, want >= 30", got.RunwayDays)
	}
}

func TestExpenseBreakdown_DominantCategory(t *testing.T) {
	tenantID := uuid.MustParse("10000000-0000-0000-0000-000000000001")
	now := time.Now()
	var txns []domain.TransactionForAnalysis
	balance := 500.0
	for _, amt := range []float64{-60, -25, -15} {
		balance += amt
		txns = append(txns, domain.TransactionForAnalysis{
			Date:           now,
			Amount:         amt,
			Category:       "A",
			RunningBalance: balance,
		})
	}
	txns[1].Category = "B"
	txns[2].Category = "C"

	repo := &fakeAnalysisRepo{txns: txns}
	uc := NewUseCase(repo)
	got, err := uc.RunAnalysis(context.Background(), tenantID)
	if err != nil {
		t.Fatalf("RunAnalysis: %v", err)
	}
	var foundDominant bool
	for _, e := range got.ExpenseBreakdown {
		if e.IsDominant {
			foundDominant = true
			break
		}
	}
	if !foundDominant {
		t.Error("expected one ExpenseBreakdown with IsDominant == true")
	}
}

func TestCollectionHealth_Irregular(t *testing.T) {
	tenantID := uuid.MustParse("10000000-0000-0000-0000-000000000001")
	base := time.Now()
	txns := []domain.TransactionForAnalysis{
		{Date: base, Amount: 1000, RunningBalance: 1000},
		{Date: base.AddDate(0, 0, 40), Amount: 500, RunningBalance: 1500},
	}

	repo := &fakeAnalysisRepo{txns: txns}
	uc := NewUseCase(repo)
	got, err := uc.RunAnalysis(context.Background(), tenantID)
	if err != nil {
		t.Fatalf("RunAnalysis: %v", err)
	}
	if !got.CollectionHealth.IsIrregular {
		t.Errorf("CollectionHealth.IsIrregular: got false, want true (gap 40 days)")
	}
	if got.CollectionHealth.LargestGapDays <= 30 {
		t.Errorf("LargestGapDays: got %d, want > 30", got.CollectionHealth.LargestGapDays)
	}
}

func TestHealthScore_Calculation(t *testing.T) {
	tenantID := uuid.MustParse("10000000-0000-0000-0000-000000000001")
	now := time.Now()
	base := now.AddDate(0, 0, -35)
	var txns []domain.TransactionForAnalysis
	txns = append(txns, domain.TransactionForAnalysis{Date: base, Amount: 5000, Category: "in", RunningBalance: 5000})
	txns = append(txns, domain.TransactionForAnalysis{Date: base, Amount: 5000, Category: "in", RunningBalance: 10000})
	for i := 0; i < 30; i++ {
		d := now.AddDate(0, 0, -29+i)
		cat := "cat1"
		if i >= 15 {
			cat = "cat2"
		}
		txns = append(txns, domain.TransactionForAnalysis{
			Date:           d,
			Amount:         -10000,
			Category:       cat,
			RunningBalance: 200000 - 10000*float64(30-i),
		})
	}
	txns[len(txns)-1].RunningBalance = 200000

	repo := &fakeAnalysisRepo{txns: txns}
	uc := NewUseCase(repo)
	got, err := uc.RunAnalysis(context.Background(), tenantID)
	if err != nil {
		t.Fatalf("RunAnalysis: %v", err)
	}
	expected := 80
	if got.HealthScore != expected {
		t.Errorf("HealthScore: got %d, want %d (0.4*liquidity + 0.3*collection + 0.3*expense)", got.HealthScore, expected)
	}
}
