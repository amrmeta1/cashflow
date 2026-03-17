package bank_parser

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// ParsedTransaction represents a transaction extracted from a PDF bank statement
type ParsedTransaction struct {
	Date        time.Time
	Description string
	Amount      float64
	Balance     float64
	Debit       float64
	Credit      float64
}

// BankParser defines the interface for parsing bank-specific PDF statements
type BankParser interface {
	// Parse extracts transactions from PDF bytes
	Parse(pdfBytes []byte) ([]ParsedTransaction, error)
	
	// DetectBankType identifies if this parser can handle the given PDF
	DetectBankType(pdfBytes []byte) (bool, error)
	
	// GetBankName returns the name of the bank this parser handles
	GetBankName() string
}

// ParserRegistry manages multiple bank parsers
type ParserRegistry struct {
	parsers map[string]BankParser
}

// NewParserRegistry creates a new parser registry with all available parsers
func NewParserRegistry() *ParserRegistry {
	registry := &ParserRegistry{
		parsers: make(map[string]BankParser),
	}
	
	// Register QNB parser
	qnbParser := NewQNBParser()
	registry.Register(qnbParser.GetBankName(), qnbParser)
	
	log.Info().Msg("parser registry initialized with available bank parsers")
	
	return registry
}

// Register adds a parser to the registry
func (r *ParserRegistry) Register(bankName string, parser BankParser) {
	r.parsers[strings.ToLower(bankName)] = parser
	log.Info().Str("bank", bankName).Msg("bank parser registered")
}

// GetParser returns a parser for the specified bank
func (r *ParserRegistry) GetParser(bankName string) (BankParser, error) {
	parser, ok := r.parsers[strings.ToLower(bankName)]
	if !ok {
		return nil, fmt.Errorf("no parser found for bank: %s", bankName)
	}
	return parser, nil
}

// DetectAndParse automatically detects the bank type and parses the PDF
func (r *ParserRegistry) DetectAndParse(pdfBytes []byte) ([]ParsedTransaction, string, error) {
	log.Info().Msg("attempting to detect bank type from PDF")
	
	// Try each parser to detect the bank type
	for bankName, parser := range r.parsers {
		isMatch, err := parser.DetectBankType(pdfBytes)
		if err != nil {
			log.Warn().Err(err).Str("bank", bankName).Msg("error detecting bank type")
			continue
		}
		
		if isMatch {
			log.Info().Str("bank", bankName).Msg("bank type detected")
			
			transactions, err := parser.Parse(pdfBytes)
			if err != nil {
				return nil, "", fmt.Errorf("failed to parse %s statement: %w", bankName, err)
			}
			
			log.Info().
				Str("bank", bankName).
				Int("transaction_count", len(transactions)).
				Msg("transactions parsed from PDF")
			
			return transactions, bankName, nil
		}
	}
	
	return nil, "", fmt.Errorf("unable to detect bank type from PDF")
}

// ExtractVendorFromDescription extracts vendor name from transaction description
func ExtractVendorFromDescription(description string) string {
	desc := strings.TrimSpace(description)
	
	// Pattern: TRANSFER [NAME]
	if strings.HasPrefix(strings.ToUpper(desc), "TRANSFER") {
		parts := strings.Fields(desc)
		if len(parts) > 1 {
			vendor := strings.Join(parts[1:], " ")
			return NormalizeVendorName(vendor)
		}
	}
	
	// Pattern: POS [MERCHANT]
	if strings.HasPrefix(strings.ToUpper(desc), "POS") {
		parts := strings.Fields(desc)
		if len(parts) > 1 {
			vendor := strings.Join(parts[1:], " ")
			return NormalizeVendorName(vendor)
		}
	}
	
	// Pattern: PAYMENT [NAME]
	if strings.HasPrefix(strings.ToUpper(desc), "PAYMENT") {
		parts := strings.Fields(desc)
		if len(parts) > 1 {
			vendor := strings.Join(parts[1:], " ")
			return NormalizeVendorName(vendor)
		}
	}
	
	// Default: use first few words as vendor
	parts := strings.Fields(desc)
	if len(parts) > 0 {
		// Take up to 4 words as vendor name
		maxWords := 4
		if len(parts) < maxWords {
			maxWords = len(parts)
		}
		vendor := strings.Join(parts[:maxWords], " ")
		return NormalizeVendorName(vendor)
	}
	
	return desc
}

// NormalizeVendorName cleans up vendor name
func NormalizeVendorName(vendor string) string {
	// Remove extra whitespace
	vendor = strings.TrimSpace(vendor)
	vendor = regexp.MustCompile(`\s+`).ReplaceAllString(vendor, " ")
	
	// Convert to title case for consistency
	vendor = strings.Title(strings.ToLower(vendor))
	
	return vendor
}

// NormalizeDescription cleans up transaction description
func NormalizeDescription(description string) string {
	// Remove extra whitespace
	desc := strings.TrimSpace(description)
	desc = regexp.MustCompile(`\s+`).ReplaceAllString(desc, " ")
	
	// Remove common noise patterns
	desc = regexp.MustCompile(`\s*-\s*$`).ReplaceAllString(desc, "")
	desc = regexp.MustCompile(`^\s*-\s*`).ReplaceAllString(desc, "")
	
	return desc
}

// CategorizeTransaction attempts to categorize based on description
func CategorizeTransaction(description string) string {
	desc := strings.ToUpper(description)
	
	// ATM withdrawals
	if strings.Contains(desc, "ATM") && strings.Contains(desc, "CASH") {
		return "cash_withdrawal"
	}
	
	// Salary/Payroll
	if strings.Contains(desc, "SALARY") || strings.Contains(desc, "PAYROLL") {
		return "payroll"
	}
	
	// Rent
	if strings.Contains(desc, "RENT") || strings.Contains(desc, "LEASE") {
		return "rent"
	}
	
	// Bank charges
	if strings.Contains(desc, "BANK CHARGE") || strings.Contains(desc, "FEE") || strings.Contains(desc, "SERVICE CHARGE") {
		return "bank_charges"
	}
	
	// Transfers
	if strings.Contains(desc, "TRANSFER") {
		return "transfer"
	}
	
	// POS transactions
	if strings.Contains(desc, "POS") {
		return "pos_purchase"
	}
	
	// Default
	return "other"
}

// ParseAmount parses amount string and returns float64
func ParseAmount(amountStr string) (float64, error) {
	// Remove whitespace and common separators
	amountStr = strings.TrimSpace(amountStr)
	amountStr = strings.ReplaceAll(amountStr, ",", "")
	amountStr = strings.ReplaceAll(amountStr, " ", "")
	
	if amountStr == "" || amountStr == "-" {
		return 0, nil
	}
	
	var amount float64
	_, err := fmt.Sscanf(amountStr, "%f", &amount)
	if err != nil {
		return 0, fmt.Errorf("failed to parse amount '%s': %w", amountStr, err)
	}
	
	return amount, nil
}
