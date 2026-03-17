package operations

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/models"
)

// VendorStatsService handles vendor statistics operations
type VendorStatsService struct {
	repo models.VendorStatsRepository
}

// NewVendorStatsService creates a new vendor stats service
func NewVendorStatsService(repo models.VendorStatsRepository) *VendorStatsService {
	return &VendorStatsService{repo: repo}
}

// UpdateStatsForTransactions updates vendor statistics for a batch of transactions
// Only processes transactions that have a vendor_id assigned
func (s *VendorStatsService) UpdateStatsForTransactions(ctx context.Context, tenantID uuid.UUID, transactions []models.BankTransaction) error {
	if len(transactions) == 0 {
		return nil
	}

	// Group transactions by vendor_id and process
	processed := 0
	skipped := 0

	for _, txn := range transactions {
		// Skip transactions without vendor assignment
		if txn.VendorID == nil {
			skipped++
			continue
		}

		// Update stats for this transaction
		err := s.repo.UpsertStats(ctx, tenantID, *txn.VendorID, txn.Amount, txn.TxnDate)
		if err != nil {
			log.Warn().
				Err(err).
				Str("vendor_id", txn.VendorID.String()).
				Str("tenant_id", tenantID.String()).
				Msg("failed to update vendor stats for transaction")
			continue
		}
		processed++
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Int("processed", processed).
		Int("skipped", skipped).
		Msg("vendor stats updated")

	return nil
}

// GetTopVendors retrieves top vendors by spending for a tenant
func (s *VendorStatsService) GetTopVendors(ctx context.Context, tenantID uuid.UUID, limit int) ([]models.VendorStatsWithVendor, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	vendors, err := s.repo.GetTopVendors(ctx, tenantID, limit)
	if err != nil {
		return nil, fmt.Errorf("getting top vendors: %w", err)
	}

	return vendors, nil
}
