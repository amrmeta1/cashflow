package parsers

import (
	"bytes"
	"fmt"
	"io"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ingestion/bank_parser"
	"github.com/finch-co/cashflow/internal/ingestion/models"
)

// PDFParser parses PDF bank statements using the bank_parser registry.
type PDFParser struct {
	tenantID  uuid.UUID
	accountID uuid.UUID
	registry  *bank_parser.ParserRegistry
}

// NewPDFParser creates a new PDF parser.
func NewPDFParser(tenantID, accountID uuid.UUID) *PDFParser {
	return &PDFParser{
		tenantID:  tenantID,
		accountID: accountID,
		registry:  bank_parser.NewParserRegistry(),
	}
}

// Parse implements the Parser interface for PDF bank statements.
func (p *PDFParser) Parse(reader io.Reader) ([]models.NormalizedTransaction, error) {
	// Read PDF bytes
	pdfBytes, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("reading PDF: %w", err)
	}

	log.Debug().Int("pdf_size", len(pdfBytes)).Msg("PDF bytes read")

	// Detect bank type and parse
	parsedTxns, bankType, err := p.registry.DetectAndParse(pdfBytes)
	if err != nil {
		return nil, fmt.Errorf("PDF parsing failed: %w", err)
	}

	log.Info().
		Str("bank_type", bankType).
		Int("transactions_parsed", len(parsedTxns)).
		Msg("PDF parsed successfully")

	// Convert to NormalizedTransaction
	var transactions []models.NormalizedTransaction
	for _, ptxn := range parsedTxns {
		normalized := p.convertToNormalized(ptxn, bankType)
		transactions = append(transactions, normalized)
	}

	return transactions, nil
}

// convertToNormalized converts a bank_parser.ParsedTransaction to NormalizedTransaction.
func (p *PDFParser) convertToNormalized(ptxn bank_parser.ParsedTransaction, bankType string) models.NormalizedTransaction {
	// Use the date directly (it's already time.Time)
	txnDate := ptxn.Date

	// Amount is already in correct format
	amount := ptxn.Amount

	// Extract vendor from description
	vendor := extractVendorFromDescription(ptxn.Description)

	return models.NormalizedTransaction{
		TenantID:    p.tenantID,
		AccountID:   p.accountID,
		Date:        txnDate,
		Amount:      amount,
		Description: ptxn.Description,
		Vendor:      vendor,
		Category:    "uncategorized", // Will be classified later
		Source:      fmt.Sprintf("pdf_%s", bankType),
		Reference:   "",
		Notes:       fmt.Sprintf("Parsed from %s PDF", bankType),
	}
}

// extractVendorFromDescription attempts to extract vendor name from description.
func extractVendorFromDescription(desc string) string {
	// Simple extraction - take first meaningful part
	// This can be enhanced with more sophisticated logic
	parts := bytes.Fields([]byte(desc))
	if len(parts) > 0 {
		return string(parts[0])
	}
	return ""
}

// Name returns the parser name.
func (p *PDFParser) Name() string {
	return "PDFParser"
}

// SupportedFormats returns supported file formats.
func (p *PDFParser) SupportedFormats() []string {
	return []string{"pdf"}
}
