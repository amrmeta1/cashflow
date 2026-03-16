package examples

// Example unit tests for the new parsers

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/ingestion/models"
	"github.com/finch-co/cashflow/internal/ingestion/parsers"
)

func TestBankCSVParser_Parse(t *testing.T) {
	tenantID := uuid.New()
	accountID := uuid.New()

	tests := []struct {
		name          string
		csv           string
		expectedCount int
		expectedError bool
	}{
		{
			name: "valid bank statement",
			csv: `date,description,amount
2024-01-01,Salary,5000.00
2024-01-02,Rent,-1500.00
2024-01-03,Groceries,-250.50`,
			expectedCount: 3,
			expectedError: false,
		},
		{
			name: "with debit/credit columns",
			csv: `date,description,debit,credit
2024-01-01,Salary,0,5000.00
2024-01-02,Rent,1500.00,0
2024-01-03,Groceries,250.50,0`,
			expectedCount: 3,
			expectedError: false,
		},
		{
			name: "with balance column",
			csv: `date,description,amount,balance
2024-01-01,Salary,5000.00,5000.00
2024-01-02,Rent,-1500.00,3500.00`,
			expectedCount: 2,
			expectedError: false,
		},
		{
			name: "missing required columns",
			csv: `description,amount
Test,100.00`,
			expectedCount: 0,
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			parser := parsers.NewBankCSVParser(tenantID, accountID)
			reader := strings.NewReader(tt.csv)

			transactions, err := parser.Parse(reader)

			if tt.expectedError {
				if err == nil {
					t.Error("expected error but got none")
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if len(transactions) != tt.expectedCount {
					t.Errorf("expected %d transactions, got %d", tt.expectedCount, len(transactions))
				}

				// Verify first transaction if exists
				if len(transactions) > 0 {
					txn := transactions[0]
					if txn.TenantID != tenantID {
						t.Errorf("expected tenant ID %v, got %v", tenantID, txn.TenantID)
					}
					if txn.AccountID != accountID {
						t.Errorf("expected account ID %v, got %v", accountID, txn.AccountID)
					}
					if txn.Description == "" {
						t.Error("expected non-empty description")
					}
					if txn.Amount == 0 {
						t.Error("expected non-zero amount")
					}
				}
			}
		})
	}
}

func TestBankCSVParser_DateParsing(t *testing.T) {
	tenantID := uuid.New()
	accountID := uuid.New()
	parser := parsers.NewBankCSVParser(tenantID, accountID)

	tests := []struct {
		name         string
		dateFormat   string
		expectedDate time.Time
	}{
		{
			name:         "ISO format",
			dateFormat:   "2024-01-15",
			expectedDate: time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
		},
		{
			name:         "DD/MM/YYYY format",
			dateFormat:   "15/01/2024",
			expectedDate: time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
		},
		{
			name:         "MM/DD/YYYY format",
			dateFormat:   "01/15/2024",
			expectedDate: time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			csv := fmt.Sprintf("date,description,amount\n%s,Test,100.00", tt.dateFormat)
			reader := strings.NewReader(csv)

			transactions, err := parser.Parse(reader)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(transactions) != 1 {
				t.Fatalf("expected 1 transaction, got %d", len(transactions))
			}

			// Compare dates (ignoring time zone)
			if transactions[0].Date.Year() != tt.expectedDate.Year() {
				t.Errorf("year mismatch: expected %d, got %d", tt.expectedDate.Year(), transactions[0].Date.Year())
			}
			if transactions[0].Date.Month() != tt.expectedDate.Month() {
				t.Errorf("month mismatch: expected %v, got %v", tt.expectedDate.Month(), transactions[0].Date.Month())
			}
			if transactions[0].Date.Day() != tt.expectedDate.Day() {
				t.Errorf("day mismatch: expected %d, got %d", tt.expectedDate.Day(), transactions[0].Date.Day())
			}
		})
	}
}

func TestLedgerParser_Parse(t *testing.T) {
	tenantID := uuid.New()
	accountID := uuid.New()

	csv := `account_name,debit,credit
Salary Account,0,5000.00
Rent Expense,1500.00,0
Utilities,250.00,0`

	parser := parsers.NewLedgerParser(tenantID, accountID)
	reader := strings.NewReader(csv)

	transactions, err := parser.Parse(reader)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(transactions) != 3 {
		t.Fatalf("expected 3 transactions, got %d", len(transactions))
	}

	// Check first transaction (credit)
	if transactions[0].Amount != 5000.0 {
		t.Errorf("expected amount 5000.0, got %f", transactions[0].Amount)
	}
	if !strings.Contains(transactions[0].Description, "Salary") {
		t.Error("expected description to contain 'Salary'")
	}

	// Check second transaction (debit)
	if transactions[1].Amount != -1500.0 {
		t.Errorf("expected amount -1500.0, got %f", transactions[1].Amount)
	}
	if !strings.Contains(transactions[1].Description, "Rent") {
		t.Error("expected description to contain 'Rent'")
	}
}

func TestNormalizedTransaction_GenerateHash(t *testing.T) {
	tenantID := uuid.New()
	accountID := uuid.New()

	txn1 := models.NormalizedTransaction{
		TenantID:    tenantID,
		AccountID:   accountID,
		Date:        time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		Amount:      100.0,
		Description: "Test Transaction",
	}

	txn2 := models.NormalizedTransaction{
		TenantID:    tenantID,
		AccountID:   accountID,
		Date:        time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		Amount:      100.0,
		Description: "Test Transaction",
	}

	hash1 := txn1.GenerateHash()
	hash2 := txn2.GenerateHash()

	// Same transaction should generate same hash
	if hash1 != hash2 {
		t.Errorf("hashes should be equal: %s != %s", hash1, hash2)
	}
	if hash1 == "" {
		t.Error("hash should not be empty")
	}
	if len(hash1) != 64 {
		t.Errorf("expected hash length 64, got %d", len(hash1))
	}
}

func TestNormalizedTransaction_Validate(t *testing.T) {
	tenantID := uuid.New()
	accountID := uuid.New()

	tests := []struct {
		name        string
		transaction models.NormalizedTransaction
		expectError bool
	}{
		{
			name: "valid transaction",
			transaction: models.NormalizedTransaction{
				TenantID:    tenantID,
				AccountID:   accountID,
				Date:        time.Now(),
				Amount:      100.0,
				Description: "Valid",
			},
			expectError: false,
		},
		{
			name: "missing tenant ID",
			transaction: models.NormalizedTransaction{
				AccountID:   accountID,
				Date:        time.Now(),
				Amount:      100.0,
				Description: "Invalid",
			},
			expectError: true,
		},
		{
			name: "missing description",
			transaction: models.NormalizedTransaction{
				TenantID:  tenantID,
				AccountID: accountID,
				Date:      time.Now(),
				Amount:    100.0,
			},
			expectError: true,
		},
		{
			name: "zero date",
			transaction: models.NormalizedTransaction{
				TenantID:    tenantID,
				AccountID:   accountID,
				Amount:      100.0,
				Description: "Invalid",
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.transaction.Validate()
			if tt.expectError {
				if err == nil {
					t.Error("expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

// Benchmark tests
func BenchmarkBankCSVParser_Parse(b *testing.B) {
	tenantID := uuid.New()
	accountID := uuid.New()
	parser := parsers.NewBankCSVParser(tenantID, accountID)

	// Generate large CSV
	var sb strings.Builder
	sb.WriteString("date,description,amount\n")
	for i := 0; i < 1000; i++ {
		sb.WriteString(fmt.Sprintf("2024-01-%02d,Transaction %d,%.2f\n", (i%28)+1, i, float64(i)*10.5))
	}
	csv := sb.String()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		reader := strings.NewReader(csv)
		_, _ = parser.Parse(reader)
	}
}

func BenchmarkNormalizedTransaction_GenerateHash(b *testing.B) {
	txn := models.NormalizedTransaction{
		TenantID:    uuid.New(),
		AccountID:   uuid.New(),
		Date:        time.Now(),
		Amount:      100.0,
		Description: "Test Transaction",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = txn.GenerateHash()
	}
}
