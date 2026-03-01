package worker

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/adapter/mq"
	"github.com/finch-co/cashflow/internal/analysis"
)

// NewAnalysisMessageHandler returns a MessageHandler that runs cash analysis and publishes completion.
func NewAnalysisMessageHandler(uc *analysis.UseCase, publisher *mq.Publisher) mq.MessageHandler {
	return func(ctx context.Context, env *mq.Envelope) error {
		tenantID, err := uuid.Parse(env.TenantID)
		if err != nil {
			return fmt.Errorf("invalid tenant_id in envelope: %w", err)
		}

		log.Info().
			Str("tenant_id", env.TenantID).
			Str("event_type", env.EventType).
			Msg("running cash analysis")

		analysis, err := uc.RunAnalysis(ctx, tenantID)
		if err != nil {
			return fmt.Errorf("run analysis: %w", err)
		}

		payload := map[string]interface{}{
			"tenant_id":    tenantID.String(),
			"health_score": analysis.HealthScore,
			"risk_level":  string(analysis.RiskLevel),
		}
		completedEnv, envErr := mq.NewEnvelope(mq.EventAnalysisCompleted, tenantID.String(), payload)
		if envErr != nil {
			log.Warn().Err(envErr).Str("tenant_id", env.TenantID).Msg("failed to create analysis.completed envelope")
			return nil // analysis succeeded; don't NACK
		}
		if pubErr := publisher.PublishEvent(ctx, mq.RKAnalysisCompleted, completedEnv); pubErr != nil {
			log.Warn().Err(pubErr).Str("tenant_id", env.TenantID).Msg("failed to publish analysis.completed")
		}

		return nil
	}
}
