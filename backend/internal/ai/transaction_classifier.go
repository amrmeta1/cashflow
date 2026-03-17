package ai

import (
	"context"
	"strings"

	"github.com/finch-co/cashflow/internal/models"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// TransactionClassifier provides AI-powered transaction classification
type TransactionClassifier struct {
	txnRepo models.BankTransactionRepository
}

// ClassificationResult holds the result of classifying a transaction
type ClassificationResult struct {
	VendorName string
	Category   string
	Confidence float64
}

// NewTransactionClassifier creates a new transaction classifier
func NewTransactionClassifier(txnRepo models.BankTransactionRepository) *TransactionClassifier {
	return &TransactionClassifier{
		txnRepo: txnRepo,
	}
}

// ClassifyTransactions classifies all unclassified transactions for a tenant
func (c *TransactionClassifier) ClassifyTransactions(ctx context.Context, tenantID uuid.UUID) error {
	// Get unclassified transactions
	txns, err := c.txnRepo.GetUnclassifiedTransactions(ctx, tenantID, 100)
	if err != nil {
		return err
	}

	if len(txns) == 0 {
		log.Debug().Str("tenant_id", tenantID.String()).Msg("no unclassified transactions found")
		return nil
	}

	// Cache to avoid duplicate classifications
	cache := make(map[string]ClassificationResult)
	var classifications []models.TransactionClassification

	for _, txn := range txns {
		// Check cache first
		result, found := cache[txn.Description]
		if !found {
			// Classify the description
			result = c.classifyDescription(txn.Description)
			cache[txn.Description] = result
		}

		classifications = append(classifications, models.TransactionClassification{
			ID:         txn.ID,
			VendorName: result.VendorName,
			Category:   result.Category,
			Confidence: result.Confidence,
		})
	}

	// Bulk update classifications
	if err := c.txnRepo.BulkUpdateClassifications(ctx, classifications); err != nil {
		return err
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Int("count", len(classifications)).
		Msg("transactions classified")

	return nil
}

// classifyDescription applies rule-based classification to a transaction description
func (c *TransactionClassifier) classifyDescription(description string) ClassificationResult {
	desc := strings.ToUpper(description)

	// Amazon
	if strings.Contains(desc, "AMZN") || strings.Contains(desc, "AMAZON") {
		return ClassificationResult{
			VendorName: "Amazon",
			Category:   "Cloud/Software",
			Confidence: 0.85,
		}
	}

	// Google
	if strings.Contains(desc, "GOOGLE") || strings.Contains(desc, "GOOGL") {
		return ClassificationResult{
			VendorName: "Google",
			Category:   "Software",
			Confidence: 0.85,
		}
	}

	// STC (Saudi Telecom)
	if strings.Contains(desc, "STC") || strings.Contains(desc, "SAUDI TELECOM") {
		return ClassificationResult{
			VendorName: "STC",
			Category:   "Telecom",
			Confidence: 0.90,
		}
	}

	// Mobily
	if strings.Contains(desc, "MOBILY") || strings.Contains(desc, "ETIHAD ETISALAT") {
		return ClassificationResult{
			VendorName: "Mobily",
			Category:   "Telecom",
			Confidence: 0.90,
		}
	}

	// Zain
	if strings.Contains(desc, "ZAIN") {
		return ClassificationResult{
			VendorName: "Zain",
			Category:   "Telecom",
			Confidence: 0.90,
		}
	}

	// Aramco
	if strings.Contains(desc, "ARAMCO") || strings.Contains(desc, "SAUDI ARAMCO") {
		return ClassificationResult{
			VendorName: "Aramco",
			Category:   "Fuel",
			Confidence: 0.90,
		}
	}

	// Careem / Uber
	if strings.Contains(desc, "CAREEM") || strings.Contains(desc, "UBER") {
		return ClassificationResult{
			VendorName: "Careem/Uber",
			Category:   "Transportation",
			Confidence: 0.85,
		}
	}

	// Jarir
	if strings.Contains(desc, "JARIR") {
		return ClassificationResult{
			VendorName: "Jarir",
			Category:   "Office Supplies",
			Confidence: 0.85,
		}
	}

	// Extra
	if strings.Contains(desc, "EXTRA") {
		return ClassificationResult{
			VendorName: "Extra",
			Category:   "Electronics",
			Confidence: 0.85,
		}
	}

	// Microsoft
	if strings.Contains(desc, "MICROSOFT") || strings.Contains(desc, "MSFT") {
		return ClassificationResult{
			VendorName: "Microsoft",
			Category:   "Software",
			Confidence: 0.85,
		}
	}

	// AWS
	if strings.Contains(desc, "AWS") || strings.Contains(desc, "AMAZON WEB") {
		return ClassificationResult{
			VendorName: "AWS",
			Category:   "Cloud/Software",
			Confidence: 0.90,
		}
	}

	// Fallback for unknown vendors
	return ClassificationResult{
		VendorName: "Unknown",
		Category:   "Other",
		Confidence: 0.50,
	}
}
