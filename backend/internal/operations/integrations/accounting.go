package integrations

import (
	"context"

	"github.com/google/uuid"
)

// Invoice represents a synced invoice from an accounting provider.
type Invoice struct {
	ExternalID  string  `json:"external_id"`
	TenantID    string  `json:"tenant_id"`
	CustomerName string `json:"customer_name"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	Status      string  `json:"status"` // draft, sent, paid, overdue
	IssueDate   string  `json:"issue_date"`
	DueDate     string  `json:"due_date"`
}

// Bill represents a synced bill from an accounting provider.
type Bill struct {
	ExternalID   string  `json:"external_id"`
	TenantID     string  `json:"tenant_id"`
	VendorName   string  `json:"vendor_name"`
	Amount       float64 `json:"amount"`
	Currency     string  `json:"currency"`
	Status       string  `json:"status"` // draft, received, paid, overdue
	IssueDate    string  `json:"issue_date"`
	DueDate      string  `json:"due_date"`
}

// AccountingProvider defines the interface for accounting system integrations.
// Implementations: Zoho Books, Wafeq, QuickBooks, etc.
type AccountingProvider interface {
	// Name returns the provider identifier (e.g. "zoho", "wafeq", "quickbooks").
	Name() string

	// FetchInvoices retrieves invoices for the given tenant.
	FetchInvoices(ctx context.Context, tenantID uuid.UUID, credentials map[string]string) ([]Invoice, error)

	// FetchBills retrieves bills/payables for the given tenant.
	FetchBills(ctx context.Context, tenantID uuid.UUID, credentials map[string]string) ([]Bill, error)
}

// StubAccountingProvider is a no-op accounting provider for development/testing.
// TODO: Replace with real Zoho/Wafeq/QuickBooks implementations.
type StubAccountingProvider struct{}

func NewStubAccountingProvider() *StubAccountingProvider {
	return &StubAccountingProvider{}
}

func (s *StubAccountingProvider) Name() string {
	return "stub"
}

func (s *StubAccountingProvider) FetchInvoices(_ context.Context, _ uuid.UUID, _ map[string]string) ([]Invoice, error) {
	// TODO: Implement real invoice fetching via Zoho/Wafeq/QuickBooks API
	return nil, nil
}

func (s *StubAccountingProvider) FetchBills(_ context.Context, _ uuid.UUID, _ map[string]string) ([]Bill, error) {
	// TODO: Implement real bill fetching via Zoho/Wafeq/QuickBooks API
	return nil, nil
}
