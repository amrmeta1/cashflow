package normalizer

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ingestion/models"
	dbmodels "github.com/finch-co/cashflow/internal/models"
)

// TransactionNormalizer handles normalization, deduplication, and conversion
// of NormalizedTransaction to BankTransaction.
type TransactionNormalizer struct {
	vendorResolver *VendorResolver
}

// NewTransactionNormalizer creates a new transaction normalizer.
func NewTransactionNormalizer(vendorRepo dbmodels.VendorRepository) *TransactionNormalizer {
	return &TransactionNormalizer{
		vendorResolver: NewVendorResolver(vendorRepo),
	}
}

// NormalizeResult contains the results of normalization.
type NormalizeResult struct {
	Transactions []dbmodels.BankTransaction
	Duplicates   int
	Validated    int
	Errors       []error
}

// Normalize processes a batch of normalized transactions:
// 1. Validates each transaction
// 2. Generates deduplication hashes
// 3. Resolves vendors
// 4. Converts to BankTransaction model
func (n *TransactionNormalizer) Normalize(
	ctx context.Context,
	transactions []models.NormalizedTransaction,
) (*NormalizeResult, error) {
	result := &NormalizeResult{
		Transactions: make([]dbmodels.BankTransaction, 0, len(transactions)),
		Errors:       make([]error, 0),
	}

	// Track hashes for duplicate detection
	seenHashes := make(map[string]bool)

	for i, txn := range transactions {
		// Validate transaction
		if err := txn.Validate(); err != nil {
			result.Errors = append(result.Errors, fmt.Errorf("transaction %d: %w", i, err))
			continue
		}
		result.Validated++

		// Generate hash if not already set
		if txn.Hash == "" {
			txn.Hash = txn.GenerateHash()
		}

		// Check for duplicates within this batch
		if seenHashes[txn.Hash] {
			result.Duplicates++
			log.Debug().
				Str("hash", txn.Hash).
				Int("index", i).
				Msg("duplicate transaction detected in batch")
			continue
		}
		seenHashes[txn.Hash] = true

		// Resolve vendor
		vendorID, vendorName := n.vendorResolver.Resolve(ctx, txn.Description, txn.Vendor)

		// Convert to BankTransaction
		bankTxn := n.toBankTransaction(txn, vendorID, vendorName)
		result.Transactions = append(result.Transactions, bankTxn)
	}

	log.Info().
		Int("input", len(transactions)).
		Int("validated", result.Validated).
		Int("duplicates", result.Duplicates).
		Int("output", len(result.Transactions)).
		Int("errors", len(result.Errors)).
		Msg("normalization completed")

	return result, nil
}

// toBankTransaction converts a NormalizedTransaction to BankTransaction.
func (n *TransactionNormalizer) toBankTransaction(
	txn models.NormalizedTransaction,
	vendorID *uuid.UUID,
	vendorName string,
) dbmodels.BankTransaction {
	return dbmodels.BankTransaction{
		TenantID:     txn.TenantID,
		AccountID:    txn.AccountID,
		TxnDate:      txn.Date,
		Amount:       txn.Amount,
		Currency:     "SAR", // Default currency
		Description:  txn.Description,
		Counterparty: vendorName,
		VendorID:     vendorID,
		Category:     txn.Category,
		Hash:         txn.Hash,
		RawID:        txn.RawID,
		// AI fields will be populated later by classification service
		AIVendorName: nil,
		AICategory:   nil,
		AIConfidence: 0,
		AIClassified: false,
	}
}

// DeduplicateAgainstExisting checks for duplicates against existing transactions.
// This should be called after database insertion to identify which were actually new.
func (n *TransactionNormalizer) DeduplicateAgainstExisting(
	transactions []models.NormalizedTransaction,
	existingHashes map[string]bool,
) []models.NormalizedTransaction {
	result := make([]models.NormalizedTransaction, 0, len(transactions))

	for _, txn := range transactions {
		if txn.Hash == "" {
			txn.Hash = txn.GenerateHash()
		}

		if !existingHashes[txn.Hash] {
			result = append(result, txn)
		}
	}

	return result
}
