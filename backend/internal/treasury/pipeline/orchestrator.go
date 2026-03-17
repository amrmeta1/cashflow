package pipeline

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ai"
	"github.com/finch-co/cashflow/internal/liquidity"
	"github.com/finch-co/cashflow/internal/models"
	"github.com/finch-co/cashflow/internal/operations"
)

// Orchestrator coordinates the treasury intelligence pipeline.
// It executes a series of analysis steps in sequence, with proper
// error handling, logging, and metrics.
type Orchestrator struct {
	// Services
	classifier      *ai.TransactionClassifier
	vendorStats     *operations.VendorStatsService
	cashFlowDNA     *operations.CashFlowDNAService
	forecastUC      *liquidity.ForecastUseCase
	advisorUC       *liquidity.AdvisorUseCase
	analysisService *operations.AnalysisService
}

// NewOrchestrator creates a new pipeline orchestrator.
func NewOrchestrator(
	classifier *ai.TransactionClassifier,
	vendorStats *operations.VendorStatsService,
	cashFlowDNA *operations.CashFlowDNAService,
	forecastUC *liquidity.ForecastUseCase,
	advisorUC *liquidity.AdvisorUseCase,
	analysisService *operations.AnalysisService,
) *Orchestrator {
	return &Orchestrator{
		classifier:      classifier,
		vendorStats:     vendorStats,
		cashFlowDNA:     cashFlowDNA,
		forecastUC:      forecastUC,
		advisorUC:       advisorUC,
		analysisService: analysisService,
	}
}

// PipelineResult contains the results of pipeline execution.
type PipelineResult struct {
	TenantID         uuid.UUID
	StartedAt        time.Time
	CompletedAt      time.Time
	Duration         time.Duration
	StepsCompleted   int
	StepsFailed      int
	StepResults      []StepResult
	FinalHealthScore int
	FinalRunwayDays  int
}

// StepResult contains the result of a single pipeline step.
type StepResult struct {
	Step      string
	StartedAt time.Time
	Duration  time.Duration
	Success   bool
	Error     error
}

// Execute runs the complete treasury intelligence pipeline for a tenant.
// Steps are executed sequentially with proper error handling.
func (o *Orchestrator) Execute(ctx context.Context, tenantID uuid.UUID) (*PipelineResult, error) {
	startTime := time.Now()

	log.Info().
		Str("tenant_id", tenantID.String()).
		Msg("treasury pipeline started")

	result := &PipelineResult{
		TenantID:    tenantID,
		StartedAt:   startTime,
		StepResults: make([]StepResult, 0, 6),
	}

	// Step 1: AI Classification
	o.executeStep(ctx, result, "ai_classification", func() error {
		if o.classifier == nil {
			return fmt.Errorf("classifier not available")
		}
		return o.classifier.ClassifyTransactions(ctx, tenantID)
	})

	// Step 2: Vendor Stats Update
	o.executeStep(ctx, result, "vendor_stats", func() error {
		if o.vendorStats == nil {
			return fmt.Errorf("vendor stats service not available")
		}
		// Vendor stats will be updated by the service
		// For now, we skip this step as it requires transaction data
		log.Debug().Msg("vendor stats update - skipped (requires transaction context)")
		return nil
	})

	// Step 3: CashFlow DNA Detection
	o.executeStep(ctx, result, "cashflow_dna", func() error {
		if o.cashFlowDNA == nil {
			return fmt.Errorf("cashflow DNA service not available")
		}
		return o.cashFlowDNA.AnalyzePatterns(ctx, tenantID)
	})

	// Step 4: Forecast Generation
	o.executeStep(ctx, result, "forecast_generation", func() error {
		if o.forecastUC == nil {
			return fmt.Errorf("forecast service not available")
		}
		_, err := o.forecastUC.GenerateForecast(ctx, tenantID)
		return err
	})

	// Step 5: Liquidity Analysis
	o.executeStep(ctx, result, "liquidity_analysis", func() error {
		if o.advisorUC == nil {
			return fmt.Errorf("advisor service not available")
		}
		return o.advisorUC.AnalyzeLiquidity(ctx, tenantID)
	})

	// Step 6: Cash Analysis
	var healthScore, runwayDays int
	o.executeStep(ctx, result, "cash_analysis", func() error {
		if o.analysisService == nil {
			return fmt.Errorf("analysis service not available")
		}
		err := o.analysisService.GenerateAnalysis(ctx, tenantID)
		if err == nil {
			// Try to get the generated analysis for metrics
			// This is optional - if it fails, we still consider the step successful
			analysis, getErr := o.getLatestAnalysis(ctx, tenantID)
			if getErr == nil && analysis != nil {
				healthScore = analysis.HealthScore
				runwayDays = analysis.RunwayDays
			}
		}
		return err
	})

	// Finalize result
	result.CompletedAt = time.Now()
	result.Duration = result.CompletedAt.Sub(result.StartedAt)
	result.FinalHealthScore = healthScore
	result.FinalRunwayDays = runwayDays

	log.Info().
		Str("tenant_id", tenantID.String()).
		Dur("duration", result.Duration).
		Int("steps_completed", result.StepsCompleted).
		Int("steps_failed", result.StepsFailed).
		Int("health_score", healthScore).
		Int("runway_days", runwayDays).
		Msg("treasury pipeline completed")

	return result, nil
}

// executeStep executes a single pipeline step with error handling and logging.
func (o *Orchestrator) executeStep(ctx context.Context, result *PipelineResult, stepName string, fn func() error) {
	stepStart := time.Now()

	log.Debug().
		Str("step", stepName).
		Msg("pipeline step started")

	err := fn()
	duration := time.Since(stepStart)

	stepResult := StepResult{
		Step:      stepName,
		StartedAt: stepStart,
		Duration:  duration,
		Success:   err == nil,
		Error:     err,
	}

	result.StepResults = append(result.StepResults, stepResult)

	if err != nil {
		result.StepsFailed++
		log.Error().
			Err(err).
			Str("step", stepName).
			Dur("duration", duration).
			Msg("pipeline step failed")
	} else {
		result.StepsCompleted++
		log.Info().
			Str("step", stepName).
			Dur("duration", duration).
			Msg("pipeline step completed")
	}
}

// getLatestAnalysis retrieves the latest analysis for metrics.
// This is a helper method and failures are not critical.
func (o *Orchestrator) getLatestAnalysis(ctx context.Context, tenantID uuid.UUID) (*models.CashAnalysis, error) {
	// This would need to be implemented with access to the analysis repository
	// For now, return nil to indicate we couldn't fetch it
	return nil, nil
}

// ExecuteAsync runs the pipeline asynchronously in a goroutine.
// This is useful for fire-and-forget execution after ingestion.
func (o *Orchestrator) ExecuteAsync(tenantID uuid.UUID) {
	go func() {
		ctx := context.Background()
		_, err := o.Execute(ctx, tenantID)
		if err != nil {
			log.Error().
				Err(err).
				Str("tenant_id", tenantID.String()).
				Msg("async pipeline execution failed")
		}
	}()
}
