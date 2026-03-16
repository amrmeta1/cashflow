package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ai"
)

// ClassificationService wraps the AI transaction classifier.
type ClassificationService struct {
	classifier *ai.TransactionClassifier
}

// NewClassificationService creates a new classification service.
func NewClassificationService(classifier *ai.TransactionClassifier) *ClassificationService {
	return &ClassificationService{
		classifier: classifier,
	}
}

// ClassifyTransactions classifies all unclassified transactions for a tenant.
func (s *ClassificationService) ClassifyTransactions(ctx context.Context, tenantID uuid.UUID) error {
	if s.classifier == nil {
		log.Warn().Msg("classifier not available, skipping classification")
		return nil
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Msg("starting AI classification")

	err := s.classifier.ClassifyTransactions(ctx, tenantID)
	if err != nil {
		log.Error().
			Err(err).
			Str("tenant_id", tenantID.String()).
			Msg("AI classification failed")
		return err
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Msg("AI classification completed")

	return nil
}
