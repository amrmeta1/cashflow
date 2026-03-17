package integrations

import (
	"context"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/models"
)

// BankProvider defines the interface for bank data integrations.
// Implementations: Lean, Tarabut, etc.
type BankProvider interface {
	// Name returns the provider identifier (e.g. "lean", "tarabut").
	Name() string

	// FetchAccounts retrieves bank accounts for the given tenant from the provider.
	FetchAccounts(ctx context.Context, tenantID uuid.UUID, credentials map[string]string) ([]models.BankAccount, error)

	// FetchTransactions retrieves transactions for the given account from the provider.
	FetchTransactions(ctx context.Context, tenantID uuid.UUID, accountID uuid.UUID, credentials map[string]string) ([]models.BankTransaction, error)
}

// StubBankProvider is a no-op bank provider for development/testing.
// TODO: Replace with real Lean/Tarabut implementations.
type StubBankProvider struct{}

func NewStubBankProvider() *StubBankProvider {
	return &StubBankProvider{}
}

func (s *StubBankProvider) Name() string {
	return "stub"
}

func (s *StubBankProvider) FetchAccounts(_ context.Context, _ uuid.UUID, _ map[string]string) ([]models.BankAccount, error) {
	// TODO: Implement real bank account fetching via Lean/Tarabut API
	return nil, nil
}

func (s *StubBankProvider) FetchTransactions(_ context.Context, _ uuid.UUID, _ uuid.UUID, _ map[string]string) ([]models.BankTransaction, error) {
	// TODO: Implement real transaction fetching via Lean/Tarabut API
	return nil, nil
}
