package bank_parser

import (
	"bytes"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/ledongthuc/pdf"
	"github.com/rs/zerolog/log"
)

// QNBParser handles QNB (Qatar National Bank) PDF statements
type QNBParser struct{}

// NewQNBParser creates a new QNB parser
func NewQNBParser() *QNBParser {
	return &QNBParser{}
}

// GetBankName returns the bank name
func (p *QNBParser) GetBankName() string {
	return "qnb"
}

// DetectBankType checks if the PDF is a QNB statement
func (p *QNBParser) DetectBankType(pdfBytes []byte) (bool, error) {
	text, err := extractTextFromPDF(pdfBytes)
	if err != nil {
		return false, err
	}

	textUpper := strings.ToUpper(text)

	// Look for QNB-specific markers
	hasQNB := strings.Contains(textUpper, "QNB") ||
		strings.Contains(textUpper, "QATAR NATIONAL BANK")

	// Look for common QNB statement headers
	hasStatementHeader := strings.Contains(textUpper, "ACCOUNT STATEMENT") ||
		strings.Contains(textUpper, "TRANSACTION HISTORY")

	return hasQNB && hasStatementHeader, nil
}

// Parse extracts transactions from QNB PDF statement
func (p *QNBParser) Parse(pdfBytes []byte) ([]ParsedTransaction, error) {
	log.Info().Msg("starting QNB PDF parsing")

	text, err := extractTextFromPDF(pdfBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to extract text from PDF: %w", err)
	}

	// Log sample of extracted text for debugging
	textSample := text
	if len(text) > 500 {
		textSample = text[:500]
	}
	log.Debug().Str("text_sample", textSample).Msg("PDF text extracted")
	log.Info().Int("text_length", len(text)).Msg("pdf text extracted successfully")

	transactions, err := p.parseTransactions(text)
	if err != nil {
		return nil, fmt.Errorf("failed to parse transactions: %w", err)
	}

	log.Info().Int("count", len(transactions)).Msg("transactions parsed from QNB statement")

	if len(transactions) == 0 {
		log.Warn().Msg("no transactions found in PDF - check if format matches expected pattern")
	}

	return transactions, nil
}

// parseTransactions extracts transaction rows from text
func (p *QNBParser) parseTransactions(text string) ([]ParsedTransaction, error) {
	lines := strings.Split(text, "\n")
	var transactions []ParsedTransaction

	// QNB transaction pattern: DATE DESCRIPTION DEBIT CREDIT BALANCE
	// Example: 01/12/2022 ATM CASH 15000 255007.02
	// Example: 04/12/2022 TRANSFER BASSEM HUSSEIN 5000 250007.02

	// Multiple regex patterns to handle different formats
	patterns := []*regexp.Regexp{
		// Pattern 1: DATE DESC DEBIT CREDIT BALANCE (full format)
		regexp.MustCompile(`(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d+)`),

		// Pattern 2: DATE DESC AMOUNT BALANCE (single amount column)
		regexp.MustCompile(`(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d+)`),

		// Pattern 3: More flexible - captures any number sequence after date and description
		regexp.MustCompile(`(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+([\d,\.\s]+)$`),
	}

	totalLines := len(lines)
	matchedLines := 0

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Try each pattern
		var matches []string
		var matchedPattern int
		for i, pattern := range patterns {
			matches = pattern.FindStringSubmatch(line)
			if matches != nil {
				matchedPattern = i + 1
				break
			}
		}

		if len(matches) >= 3 {
			matchedLines++
			txn, err := p.parseTransactionLine(matches)
			if err != nil {
				log.Warn().
					Err(err).
					Str("line", line).
					Int("pattern", matchedPattern).
					Msg("failed to parse transaction line")
				continue
			}

			if txn != nil {
				transactions = append(transactions, *txn)
				log.Debug().
					Str("date", txn.Date.Format("2006-01-02")).
					Str("description", txn.Description).
					Float64("amount", txn.Amount).
					Int("pattern", matchedPattern).
					Msg("transaction parsed")
			}
		}
	}

	log.Info().
		Int("total_lines", totalLines).
		Int("matched_lines", matchedLines).
		Int("parsed_transactions", len(transactions)).
		Msg("PDF parsing stats")

	return transactions, nil
}

// parseTransactionLine parses a single transaction line
func (p *QNBParser) parseTransactionLine(matches []string) (*ParsedTransaction, error) {
	if len(matches) < 3 {
		return nil, fmt.Errorf("insufficient matches in transaction line")
	}

	// Parse date (DD/MM/YYYY or DD-MM-YYYY format)
	dateStr := matches[1]
	dateStr = strings.ReplaceAll(dateStr, "-", "/") // Normalize to slash format
	txnDate, err := time.Parse("02/01/2006", dateStr)
	if err != nil {
		// Try alternative format
		txnDate, err = time.Parse("01/02/2006", dateStr)
		if err != nil {
			return nil, fmt.Errorf("failed to parse date '%s': %w", dateStr, err)
		}
	}

	// Extract description
	description := strings.TrimSpace(matches[2])
	if description == "" {
		return nil, fmt.Errorf("empty description")
	}

	// Parse amounts - handle flexible number of amount fields
	var debit, credit, balance float64

	if len(matches) == 6 {
		// Full format: DATE DESC DEBIT CREDIT BALANCE
		if matches[3] != "" && matches[3] != "-" {
			debit, _ = ParseAmount(matches[3])
		}
		if matches[4] != "" && matches[4] != "-" {
			credit, _ = ParseAmount(matches[4])
		}
		if matches[5] != "" {
			balance, _ = ParseAmount(matches[5])
		}
	} else if len(matches) == 5 {
		// Format: DATE DESC AMOUNT BALANCE
		amount, _ := ParseAmount(matches[3])
		balance, _ = ParseAmount(matches[4])

		// Determine if amount is debit or credit based on description
		if isDebitTransaction(description) {
			debit = amount
		} else {
			credit = amount
		}
	} else if len(matches) == 4 {
		// Format: DATE DESC AMOUNTS (flexible)
		// Try to parse all numbers from the amounts string
		amountsStr := matches[3]
		numbers := parseAllNumbers(amountsStr)

		if len(numbers) >= 2 {
			// Assume last number is balance, previous is amount
			balance = numbers[len(numbers)-1]
			amount := numbers[len(numbers)-2]

			if len(numbers) == 3 {
				// Three numbers: likely DEBIT CREDIT BALANCE
				debit = numbers[0]
				credit = numbers[1]
				balance = numbers[2]
			} else {
				// Two numbers: AMOUNT BALANCE
				if isDebitTransaction(description) {
					debit = amount
				} else {
					credit = amount
				}
			}
		} else if len(numbers) == 1 {
			// Only one number - assume it's balance
			balance = numbers[0]
		}
	}

	// Calculate net amount (credit is positive, debit is negative)
	amount := credit - debit

	// Skip transactions with no amount
	if amount == 0 && debit == 0 && credit == 0 {
		return nil, fmt.Errorf("no amount found")
	}

	txn := &ParsedTransaction{
		Date:        txnDate,
		Description: NormalizeDescription(description),
		Amount:      amount,
		Balance:     balance,
		Debit:       debit,
		Credit:      credit,
	}

	return txn, nil
}

// isDebitTransaction determines if a transaction is likely a debit based on description
func isDebitTransaction(description string) bool {
	desc := strings.ToUpper(description)

	// Common debit indicators
	debitKeywords := []string{
		"ATM", "WITHDRAWAL", "PAYMENT", "TRANSFER", "POS",
		"PURCHASE", "FEE", "CHARGE", "DEBIT",
	}

	for _, keyword := range debitKeywords {
		if strings.Contains(desc, keyword) {
			return true
		}
	}

	return false
}

// extractTextFromPDF extracts text content from PDF bytes
func extractTextFromPDF(pdfBytes []byte) (string, error) {
	reader := bytes.NewReader(pdfBytes)

	pdfReader, err := pdf.NewReader(reader, int64(len(pdfBytes)))
	if err != nil {
		return "", fmt.Errorf("failed to create PDF reader: %w", err)
	}

	var textBuilder strings.Builder

	numPages := pdfReader.NumPage()
	log.Info().Int("pages", numPages).Msg("pdf pages detected")

	for pageNum := 1; pageNum <= numPages; pageNum++ {
		page := pdfReader.Page(pageNum)
		if page.V.IsNull() {
			continue
		}

		text, err := page.GetPlainText(nil)
		if err != nil {
			log.Warn().Err(err).Int("page", pageNum).Msg("failed to extract text from page")
			continue
		}

		textBuilder.WriteString(text)
		textBuilder.WriteString("\n")
	}

	return textBuilder.String(), nil
}
