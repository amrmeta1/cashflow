package detector

import (
	"fmt"

	"github.com/rs/zerolog/log"
)

// DocumentDetector analyzes CSV headers to determine document type.
type DocumentDetector struct {
	// Rule-based detection - no state needed for now
}

// NewDocumentDetector creates a new document detector.
func NewDocumentDetector() *DocumentDetector {
	return &DocumentDetector{}
}

// DetectCSVType analyzes CSV headers and returns the detected document type.
// Detection priority:
// 1. Ledger (more specific: debit/credit + account)
// 2. Bank Statement (more flexible: date + description)
// 3. Unknown (fallback)
func (d *DocumentDetector) DetectCSVType(headers []string, colMap map[string]int) (DocumentType, error) {
	log.Debug().Strs("headers", headers).Msg("detecting document type")

	// Check for ledger format first (more specific indicators)
	if d.isLedgerFormat(colMap) {
		log.Info().
			Str("document_type", string(DocumentTypeLedger)).
			Strs("headers", headers).
			Msg("detected ledger format")
		return DocumentTypeLedger, nil
	}

	// Check for bank statement format
	if d.isBankStatementFormat(colMap) {
		log.Info().
			Str("document_type", string(DocumentTypeBankStatement)).
			Strs("headers", headers).
			Msg("detected bank statement format")
		return DocumentTypeBankStatement, nil
	}

	// Unknown format
	return DocumentTypeUnknown, fmt.Errorf(
		"unable to detect document type - expected bank statement (date, description) or ledger (debit/credit, account). Found columns: %v",
		headers,
	)
}

// isLedgerFormat checks if the CSV has ledger format indicators.
// Required: (debit OR credit) AND (account OR account_name)
func (d *DocumentDetector) isLedgerFormat(colMap map[string]int) bool {
	// Check for debit or credit columns
	_, hasDebit := colMap["debit"]
	_, hasCredit := colMap["credit"]
	hasAmountColumns := hasDebit || hasCredit

	// Check for account columns
	_, hasAccount := colMap["account"]
	_, hasAccountName := colMap["account_name"]
	hasAccountColumn := hasAccount || hasAccountName

	return hasAmountColumns && hasAccountColumn
}

// isBankStatementFormat checks if the CSV has bank statement format indicators.
// Required: date AND description
func (d *DocumentDetector) isBankStatementFormat(colMap map[string]int) bool {
	_, hasDate := colMap["date"]
	_, hasDescription := colMap["description"]

	return hasDate && hasDescription
}

// ValidateColumns validates that required columns exist for the detected document type.
func (d *DocumentDetector) ValidateColumns(docType DocumentType, colMap map[string]int, headers []string) error {
	switch docType {
	case DocumentTypeLedger:
		return d.validateLedgerColumns(colMap, headers)
	case DocumentTypeBankStatement:
		return d.validateBankStatementColumns(colMap, headers)
	default:
		return fmt.Errorf("unknown document type: %s", docType)
	}
}

// validateLedgerColumns validates ledger format columns.
func (d *DocumentDetector) validateLedgerColumns(colMap map[string]int, headers []string) error {
	// Check for debit or credit
	_, hasDebit := colMap["debit"]
	_, hasCredit := colMap["credit"]
	if !hasDebit && !hasCredit {
		return fmt.Errorf(
			"ledger format requires 'debit' or 'credit' column. Found columns: %v",
			headers,
		)
	}

	// Check for account column
	_, hasAccount := colMap["account"]
	_, hasAccountName := colMap["account_name"]
	if !hasAccount && !hasAccountName {
		return fmt.Errorf(
			"ledger format requires 'account' or 'account_name' column. Found columns: %v",
			headers,
		)
	}

	log.Debug().
		Bool("has_debit", hasDebit).
		Bool("has_credit", hasCredit).
		Bool("has_account", hasAccount || hasAccountName).
		Msg("ledger columns validated")

	return nil
}

// validateBankStatementColumns validates bank statement format columns.
func (d *DocumentDetector) validateBankStatementColumns(colMap map[string]int, headers []string) error {
	// Check for date
	_, hasDate := colMap["date"]
	if !hasDate {
		return fmt.Errorf(
			"bank statement format requires 'date' column. Found columns: %v",
			headers,
		)
	}

	// Check for description
	_, hasDescription := colMap["description"]
	if !hasDescription {
		return fmt.Errorf(
			"bank statement format requires 'description' column. Found columns: %v",
			headers,
		)
	}

	// Check for amount columns (at least one of: amount, debit/credit)
	_, hasAmount := colMap["amount"]
	_, hasDebit := colMap["debit"]
	_, hasCredit := colMap["credit"]
	hasAmountColumn := hasAmount || (hasDebit && hasCredit)

	if !hasAmountColumn {
		return fmt.Errorf(
			"bank statement format requires 'amount' or 'debit'+'credit' columns. Found columns: %v",
			headers,
		)
	}

	log.Debug().
		Bool("has_date", hasDate).
		Bool("has_description", hasDescription).
		Bool("has_amount", hasAmount).
		Bool("has_debit_credit", hasDebit && hasCredit).
		Msg("bank statement columns validated")

	return nil
}

// BuildColumnMap creates a map from column names (case-insensitive and trimmed) to their index.
func BuildColumnMap(headers []string) map[string]int {
	colMap := make(map[string]int, len(headers))
	for i, col := range headers {
		normalized := normalizeColumnName(col)
		colMap[normalized] = i
	}
	return colMap
}

// normalizeColumnName converts a column name to lowercase and trims whitespace.
func normalizeColumnName(col string) string {
	// Convert to lowercase and trim
	normalized := ""
	for _, r := range col {
		if r >= 'A' && r <= 'Z' {
			normalized += string(r + 32) // Convert to lowercase
		} else if r != ' ' && r != '\t' && r != '\n' && r != '\r' {
			normalized += string(r)
		} else if len(normalized) > 0 && normalized[len(normalized)-1] != '_' {
			normalized += "_"
		}
	}
	
	// Trim trailing underscores
	for len(normalized) > 0 && normalized[len(normalized)-1] == '_' {
		normalized = normalized[:len(normalized)-1]
	}
	
	return normalized
}
