package parsers

import (
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ingestion/detector"
	"github.com/finch-co/cashflow/internal/ingestion/models"
)

// BankCSVParser parses bank statement CSV files.
type BankCSVParser struct {
	tenantID  uuid.UUID
	accountID uuid.UUID
}

// NewBankCSVParser creates a new bank CSV parser.
func NewBankCSVParser(tenantID, accountID uuid.UUID) *BankCSVParser {
	return &BankCSVParser{
		tenantID:  tenantID,
		accountID: accountID,
	}
}

// Parse implements the Parser interface for bank statement CSVs.
func (p *BankCSVParser) Parse(reader io.Reader) ([]models.NormalizedTransaction, error) {
	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1 // Allow variable number of fields

	// Read header
	header, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("reading CSV header: %w", err)
	}

	log.Debug().Strs("headers", header).Msg("CSV headers read")

	// Build column map
	colMap := detector.BuildColumnMap(header)

	// Detect and validate document type
	det := detector.NewDocumentDetector()
	docType, err := det.DetectCSVType(header, colMap)
	if err != nil {
		return nil, fmt.Errorf("document detection: %w", err)
	}

	if docType != detector.DocumentTypeBankStatement {
		return nil, fmt.Errorf("expected bank statement format, got %s", docType)
	}

	if err := det.ValidateColumns(docType, colMap, header); err != nil {
		return nil, fmt.Errorf("column validation: %w", err)
	}

	// Parse rows
	var transactions []models.NormalizedTransaction
	rowNum := 1 // Start at 1 (header is row 0)

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
			log.Warn().Err(err).Int("row", rowNum).Msg("error parsing row")
			continue
		}

		transactions = append(transactions, *txn)
	}

	log.Info().
		Int("rows_read", rowNum-1).
		Int("transactions_parsed", len(transactions)).
		Msg("bank CSV parsing completed")

	return transactions, nil
}

// parseRow parses a single CSV row into a NormalizedTransaction.
func (p *BankCSVParser) parseRow(record []string, colMap map[string]int, _ int) (*models.NormalizedTransaction, error) {
	getCol := func(name string) string {
		if idx, ok := colMap[name]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	// Parse date
	dateStr := getCol("date")
	if dateStr == "" {
		return nil, fmt.Errorf("missing date")
	}

	txnDate, err := parseDate(dateStr)
	if err != nil {
		return nil, fmt.Errorf("invalid date %q: %w", dateStr, err)
	}

	// Parse description
	description := getCol("description")
	if description == "" {
		return nil, fmt.Errorf("missing description")
	}

	// Parse amount (supports both amount column and debit/credit columns)
	amount, err := p.parseAmount(getCol, colMap)
	if err != nil {
		return nil, err
	}

	// Optional fields
	currency := getCol("currency")
	if currency == "" {
		currency = "SAR"
	}

	category := getCol("category")
	if category == "" {
		category = "uncategorized"
	}

	counterparty := getCol("counterparty")
	reference := getCol("reference")
	notes := getCol("notes")

	// Parse balance if available
	var balance *float64
	balanceStr := getCol("balance")
	if balanceStr != "" {
		bal, err := parseFloat(balanceStr)
		if err == nil {
			balance = &bal
		}
	}

	return &models.NormalizedTransaction{
		TenantID:    p.tenantID,
		AccountID:   p.accountID,
		Date:        txnDate,
		Amount:      amount,
		Description: description,
		Vendor:      counterparty,
		Category:    category,
		Source:      "csv",
		Balance:     balance,
		Reference:   reference,
		Notes:       notes,
	}, nil
}

// parseAmount extracts amount from either amount column or debit/credit columns.
func (p *BankCSVParser) parseAmount(getCol func(string) string, colMap map[string]int) (float64, error) {
	// Try amount column first
	amountStr := getCol("amount")
	if amountStr != "" && amountStr != "-" && amountStr != "0" {
		return parseFloat(amountStr)
	}

	// Try debit/credit columns
	_, hasDebit := colMap["debit"]
	_, hasCredit := colMap["credit"]

	if !hasDebit && !hasCredit {
		return 0, fmt.Errorf("no amount, debit, or credit column found")
	}

	debitStr := getCol("debit")
	creditStr := getCol("credit")

	var debit, credit float64
	var err error

	if debitStr != "" && debitStr != "-" && debitStr != "0" {
		debit, err = parseFloat(debitStr)
		if err != nil {
			log.Warn().Str("debit", debitStr).Msg("failed to parse debit")
			debit = 0
		}
	}

	if creditStr != "" && creditStr != "-" && creditStr != "0" {
		credit, err = parseFloat(creditStr)
		if err != nil {
			log.Warn().Str("credit", creditStr).Msg("failed to parse credit")
			credit = 0
		}
	}

	if debit == 0 && credit == 0 {
		return 0, fmt.Errorf("no amount value found")
	}

	// Credit is positive, debit is negative
	return credit - debit, nil
}

// Name returns the parser name.
func (p *BankCSVParser) Name() string {
	return "BankCSVParser"
}

// SupportedFormats returns supported file formats.
func (p *BankCSVParser) SupportedFormats() []string {
	return []string{"csv"}
}

// parseDate attempts to parse a date string using multiple formats.
func parseDate(dateStr string) (time.Time, error) {
	layouts := []string{
		"2006-01-02",
		"02/01/2006",
		"01/02/2006",
		"2006/01/02",
		"02-01-2006",
		"01-02-2006",
		"2-Jan-2006",
		"02-Jan-2006",
		"2006-Jan-02",
	}

	for _, layout := range layouts {
		t, err := time.Parse(layout, dateStr)
		if err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse date with known formats")
}

// parseFloat parses a float from a string, removing commas and currency symbols.
func parseFloat(s string) (float64, error) {
	// Remove commas, currency symbols, and whitespace
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, "SAR", "")
	s = strings.ReplaceAll(s, "QAR", "")
	s = strings.ReplaceAll(s, "USD", "")
	s = strings.TrimSpace(s)

	return strconv.ParseFloat(s, 64)
}
