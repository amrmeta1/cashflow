package models

import (
	"crypto/sha256"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// NormalizedTransaction is the canonical intermediate format used by all parsers.
// It represents a financial transaction in a standardized way before conversion
// to the final BankTransaction model.
type NormalizedTransaction struct {
	// Core identifiers
	TenantID  uuid.UUID
	AccountID uuid.UUID
	
	// Transaction details
	Date        time.Time
	Amount      float64
	Description string
	
	// Enrichment fields
	Vendor      string
	Category    string
	
	// Metadata
	Source      string    // e.g., "csv", "pdf", "api"
	Hash        string    // Deduplication hash
	RawID       *uuid.UUID // Reference to raw_bank_transactions
	
	// Optional fields
	Balance     *float64  // Running balance (if available)
	Reference   string    // Transaction reference/ID from source
	Notes       string    // Additional notes
}

// GenerateHash creates a deduplication hash for this transaction.
// Hash format: SHA256({tenant_id}|{account_id}|{date}|{amount}|{description})
func (nt *NormalizedTransaction) GenerateHash() string {
	dateStr := nt.Date.Format("2006-01-02")
	raw := fmt.Sprintf("%s|%s|%s|%.2f|%s",
		nt.TenantID.String(),
		nt.AccountID.String(),
		dateStr,
		nt.Amount,
		nt.Description,
	)
	hash := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("%x", hash)
}

// Validate checks if the normalized transaction has all required fields.
func (nt *NormalizedTransaction) Validate() error {
	if nt.TenantID == uuid.Nil {
		return fmt.Errorf("tenant_id is required")
	}
	if nt.AccountID == uuid.Nil {
		return fmt.Errorf("account_id is required")
	}
	if nt.Date.IsZero() {
		return fmt.Errorf("date is required")
	}
	if nt.Amount == 0 {
		return fmt.Errorf("amount cannot be zero")
	}
	if nt.Description == "" {
		return fmt.Errorf("description is required")
	}
	return nil
}

// IsInflow returns true if this is an inflow transaction (positive amount).
func (nt *NormalizedTransaction) IsInflow() bool {
	return nt.Amount > 0
}

// IsOutflow returns true if this is an outflow transaction (negative amount).
func (nt *NormalizedTransaction) IsOutflow() bool {
	return nt.Amount < 0
}
