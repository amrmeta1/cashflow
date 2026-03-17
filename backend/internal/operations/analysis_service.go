package operations

import (
	"context"
	"time"

	"github.com/finch-co/cashflow/internal/models"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// AnalysisService generates cash analysis from transactions
type AnalysisService struct {
	analysisRepo models.AnalysisRepository
	txnRepo      models.BankTransactionRepository
}

// NewAnalysisService creates a new analysis service
func NewAnalysisService(analysisRepo models.AnalysisRepository, txnRepo models.BankTransactionRepository) *AnalysisService {
	return &AnalysisService{
		analysisRepo: analysisRepo,
		txnRepo:      txnRepo,
	}
}

// GenerateAnalysis creates a basic cash analysis for a tenant
func (s *AnalysisService) GenerateAnalysis(ctx context.Context, tenantID uuid.UUID) error {
	// Get transactions for analysis
	txns, total, err := s.txnRepo.List(ctx, models.TransactionFilter{
		TenantID: tenantID,
		Limit:    1000, // Last 1000 transactions
	})
	if err != nil {
		return err
	}

	if len(txns) == 0 {
		log.Debug().Str("tenant_id", tenantID.String()).Msg("no transactions to analyze")
		return nil
	}

	// Calculate basic metrics
	var totalInflow, totalOutflow float64
	for _, txn := range txns {
		if txn.Amount > 0 {
			totalInflow += txn.Amount
		} else {
			totalOutflow += -txn.Amount
		}
	}

	dailyBurn := totalOutflow / 30.0 // Rough estimate
	currentBalance := totalInflow - totalOutflow
	
	var runwayDays int
	if dailyBurn > 0 {
		runwayDays = int(currentBalance / dailyBurn)
	}

	// Determine risk level
	var riskLevel models.RiskLevel
	var healthScore int
	if runwayDays < 15 {
		riskLevel = models.RiskLevelCritical
		healthScore = 30
	} else if runwayDays < 30 {
		riskLevel = models.RiskLevelWarning
		healthScore = 60
	} else {
		riskLevel = models.RiskLevelHealthy
		healthScore = 90
	}

	// Create analysis
	analysis := &models.CashAnalysis{
		TenantID:   tenantID,
		AnalyzedAt: time.Now(),
		HealthScore: healthScore,
		RiskLevel:  riskLevel,
		RunwayDays: runwayDays,
		Liquidity: models.LiquidityAnalysis{
			CurrentBalance: currentBalance,
			DailyBurnRate:  dailyBurn,
			RunwayDays:     runwayDays,
			RiskLevel:      riskLevel,
		},
		TransactionCount: total,
		SourceReference:  "auto_import",
		AnalysisVersion:  "1.0",
	}

	// Save analysis
	if err := s.analysisRepo.Save(ctx, analysis); err != nil {
		return err
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Int("health_score", healthScore).
		Int("runway_days", runwayDays).
		Msg("cash analysis generated")

	return nil
}
