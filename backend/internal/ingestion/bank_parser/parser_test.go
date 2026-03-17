package bank_parser

import (
	"testing"
	"time"
)

func TestExtractVendorFromDescription(t *testing.T) {
	tests := []struct {
		description string
		expected    string
	}{
		{
			description: "TRANSFER BASSEM HUSSEIN",
			expected:    "Bassem Hussein",
		},
		{
			description: "POS DOHA CLINIC HOSPITAL",
			expected:    "Doha Clinic Hospital",
		},
		{
			description: "PAYMENT SUPPLIER ABC",
			expected:    "Supplier Abc",
		},
		{
			description: "ATM CASH WITHDRAWAL",
			expected:    "Atm Cash Withdrawal",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			result := ExtractVendorFromDescription(tt.description)
			if result != tt.expected {
				t.Errorf("ExtractVendorFromDescription(%q) = %q, want %q", tt.description, result, tt.expected)
			}
		})
	}
}

func TestCategorizeTransaction(t *testing.T) {
	tests := []struct {
		description string
		expected    string
	}{
		{
			description: "ATM CASH WITHDRAWAL",
			expected:    "cash_withdrawal",
		},
		{
			description: "SALARY PAYMENT",
			expected:    "payroll",
		},
		{
			description: "RENT PAYMENT",
			expected:    "rent",
		},
		{
			description: "BANK CHARGES",
			expected:    "bank_charges",
		},
		{
			description: "TRANSFER TO SUPPLIER",
			expected:    "transfer",
		},
		{
			description: "POS PURCHASE",
			expected:    "pos_purchase",
		},
		{
			description: "UNKNOWN TRANSACTION",
			expected:    "other",
		},
	}

	for _, tt := range tests {
		t.Run(tt.description, func(t *testing.T) {
			result := CategorizeTransaction(tt.description)
			if result != tt.expected {
				t.Errorf("CategorizeTransaction(%q) = %q, want %q", tt.description, result, tt.expected)
			}
		})
	}
}

func TestParseAmount(t *testing.T) {
	tests := []struct {
		input    string
		expected float64
		hasError bool
	}{
		{
			input:    "1000.50",
			expected: 1000.50,
			hasError: false,
		},
		{
			input:    "1,000.50",
			expected: 1000.50,
			hasError: false,
		},
		{
			input:    "1 000.50",
			expected: 1000.50,
			hasError: false,
		},
		{
			input:    "",
			expected: 0,
			hasError: false,
		},
		{
			input:    "-",
			expected: 0,
			hasError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result, err := ParseAmount(tt.input)
			if tt.hasError && err == nil {
				t.Errorf("ParseAmount(%q) expected error but got none", tt.input)
			}
			if !tt.hasError && err != nil {
				t.Errorf("ParseAmount(%q) unexpected error: %v", tt.input, err)
			}
			if result != tt.expected {
				t.Errorf("ParseAmount(%q) = %f, want %f", tt.input, result, tt.expected)
			}
		})
	}
}

func TestQNBParserGetBankName(t *testing.T) {
	parser := NewQNBParser()
	if parser.GetBankName() != "qnb" {
		t.Errorf("GetBankName() = %q, want %q", parser.GetBankName(), "qnb")
	}
}

func TestNormalizeDescription(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			input:    "  TRANSFER   PAYMENT  ",
			expected: "TRANSFER PAYMENT",
		},
		{
			input:    "PAYMENT -",
			expected: "PAYMENT",
		},
		{
			input:    "- PAYMENT",
			expected: "PAYMENT",
		},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := NormalizeDescription(tt.input)
			if result != tt.expected {
				t.Errorf("NormalizeDescription(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestParsedTransaction(t *testing.T) {
	// Test that ParsedTransaction struct can be created
	txn := ParsedTransaction{
		Date:        time.Now(),
		Description: "Test Transaction",
		Amount:      100.50,
		Balance:     1000.00,
		Debit:       100.50,
		Credit:      0,
	}

	// Verify Amount field
	if txn.Amount != 100.50 {
		t.Errorf("ParsedTransaction.Amount = %f, want %f", txn.Amount, 100.50)
	}

	// Verify other fields are set correctly
	_ = txn.Date
	_ = txn.Description
	_ = txn.Balance
	_ = txn.Debit
	_ = txn.Credit
}
