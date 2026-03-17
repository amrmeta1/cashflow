package parsers

import (
	"encoding/csv"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ingestion/detector"
	"github.com/finch-co/cashflow/internal/ingestion/models"
)

// LedgerParser parses accounting ledger CSV files with debit/credit columns.
type LedgerParser struct {
	tenantID  uuid.UUID
	accountID uuid.UUID
}

// NewLedgerParser creates a new ledger parser.
func NewLedgerParser(tenantID, accountID uuid.UUID) *LedgerParser {
	return &LedgerParser{
		tenantID:  tenantID,
		accountID: accountID,
	}
}

// Parse implements the Parser interface for ledger CSVs.
func (p *LedgerParser) Parse(reader io.Reader) ([]models.NormalizedTransaction, error) {
	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1

	// Read header
	header, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("reading CSV header: %w", err)
	}

	log.Debug().Strs("headers", header).Msg("ledger CSV headers read")

	// Build column map
	colMap := detector.BuildColumnMap(header)

	// Detect and validate document type
	det := detector.NewDocumentDetector()
	docType, err := det.DetectCSVType(header, colMap)
	if err != nil {
		return nil, fmt.Errorf("document detection: %w", err)
	}

	if docType != detector.DocumentTypeLedger {
		return nil, fmt.Errorf("expected ledger format, got %s", docType)
	}

	if err := det.ValidateColumns(docType, colMap, header); err != nil {
		return nil, fmt.Errorf("column validation: %w", err)
	}

	// Parse rows
	var transactions []models.NormalizedTransaction
	rowNum := 1

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Warn().Err(err).Int("row", rowNum).Msg("error reading CSV row")
			rowNum++
			continue
		}

		rowNum++

		txn, err := p.parseRow(record, colMap, rowNum)
		if err != nil {
			log.Warn().Err(err).Int("row", rowNum).Msg("error parsing ledger row")
			continue
		}

		transactions = append(transactions, *txn)
	}

	log.Info().
		Int("rows_read", rowNum-1).
		Int("transactions_parsed", len(transactions)).
		Msg("ledger CSV parsing completed")

	return transactions, nil
}

// parseRow parses a single ledger row into a NormalizedTransaction.
func (p *LedgerParser) parseRow(record []string, colMap map[string]int, _ int) (*models.NormalizedTransaction, error) {
	getCol := func(name string) string {
		if idx, ok := colMap[name]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	// Get account name or account for description
	description := getCol("account_name")
	if description == "" {
		description = getCol("account")
	}
	if description == "" {
		description = getCol("description")
	}

	if description == "" {
		return nil, fmt.Errorf("missing account name/description")
	}

	// Parse debit and credit amounts
	debitStr := getCol("debit")
	creditStr := getCol("credit")

	var debit, credit float64
	var err error

	if debitStr != "" && debitStr != "-" && debitStr != "0" {
		debit, err = parseFloat(debitStr)
		if err != nil {
			log.Warn().Str("debit", debitStr).Msg("failed to parse debit amount")
			debit = 0
		}
	}

	if creditStr != "" && creditStr != "-" && creditStr != "0" {
		credit, err = parseFloat(creditStr)
		if err != nil {
			log.Warn().Str("credit", creditStr).Msg("failed to parse credit amount")
			credit = 0
		}
	}

	// Skip rows with no debit or credit
	if debit == 0 && credit == 0 {
		return nil, fmt.Errorf("no debit or credit amount")
	}

	// Calculate net amount: credit is positive, debit is negative
	amount := credit - debit

	// Parse date if available, otherwise use current date
	txnDate := time.Now()
	dateStr := getCol("date")
	if dateStr != "" {
		parsedDate, err := parseDate(dateStr)
		if err == nil {
			txnDate = parsedDate
		} else {
			log.Warn().Str("date", dateStr).Msg("failed to parse date, using current date")
		}
	}

	// Parse currency
	currency := getCol("currency")
	if currency == "" {
		currency = "SAR"
	}

	// Categorize based on account name
	category := categorizeFromAccountName(description)

	// Parse balance if available
	var balance *float64
	balanceStr := getCol("balance")
	if balanceStr != "" {
		bal, err := parseFloat(balanceStr)
		if err == nil {
			balance = &bal
		}
	}

	reference := getCol("reference")
	notes := getCol("notes")

	return &models.NormalizedTransaction{
		TenantID:    p.tenantID,
		AccountID:   p.accountID,
		Date:        txnDate,
		Amount:      amount,
		Description: description,
		Vendor:      description, // Use account name as vendor for ledger data
		Category:    category,
		Source:      "ledger",
		Balance:     balance,
		Reference:   reference,
		Notes:       notes,
	}, nil
}

// Name returns the parser name.
func (p *LedgerParser) Name() string {
	return "LedgerParser"
}

// SupportedFormats returns supported file formats.
func (p *LedgerParser) SupportedFormats() []string {
	return []string{"csv"}
}

// categorizeFromAccountName attempts to categorize based on account name.
func categorizeFromAccountName(accountName string) string {
	accountUpper := strings.ToUpper(accountName)

	// Common account patterns
	patterns := map[string]string{
		"SALARY":      "income",
		"INCOME":      "income",
		"REVENUE":     "income",
		"RENT":        "rent",
		"UTILITIES":   "utilities",
		"ELECTRICITY": "utilities",
		"WATER":       "utilities",
		"PAYROLL":     "payroll",
		"WAGES":       "payroll",
		"SUPPLIER":    "vendor_payment",
		"VENDOR":      "vendor_payment",
		"BANK":        "bank_fees",
		"FEE":         "bank_fees",
		"TAX":         "tax",
		"INSURANCE":   "insurance",
		"MARKETING":   "marketing",
		"ADVERTISING": "marketing",
		"TRAVEL":      "travel",
		"OFFICE":      "office_supplies",
	}

	for keyword, category := range patterns {
		if strings.Contains(accountUpper, keyword) {
			return category
		}
	}

	return "uncategorized"
}
