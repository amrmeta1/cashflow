package ingestion

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
)

func TestGetCashPosition_ZeroAccounts(t *testing.T) {
	tenantID := uuid.MustParse("10000000-0000-0000-0000-000000000001")
	asOf := time.Date(2026, 2, 26, 0, 0, 0, 0, time.UTC)

	uc := NewUseCase(
		&fakeBankAccountRepo{list: func(ctx context.Context, tid uuid.UUID, limit, offset int) ([]domain.BankAccount, int, error) {
			return nil, 0, nil
		}},
		nil,
		&fakeBankTxnRepo{sum: func(ctx context.Context, tid uuid.UUID, as time.Time) (map[uuid.UUID]float64, error) {
			return map[uuid.UUID]float64{}, nil
		}},
		nil,
		nil,
		nil,
	)

	pos, err := uc.GetCashPosition(context.Background(), tenantID, asOf)
	if err != nil {
		t.Fatalf("GetCashPosition: %v", err)
	}
	if pos.TenantID != tenantID.String() {
		t.Errorf("tenantId: got %s", pos.TenantID)
	}
	if pos.AsOf != "2026-02-26" {
		t.Errorf("asOf: got %s", pos.AsOf)
	}
	if len(pos.Accounts) != 0 {
		t.Errorf("accounts: got %d", len(pos.Accounts))
	}
	if len(pos.Totals.ByCurrency) != 0 {
		t.Errorf("totals.byCurrency: got %d", len(pos.Totals.ByCurrency))
	}
}

func TestGetCashPosition_WithAccountsAndBalances(t *testing.T) {
	tenantID := uuid.MustParse("10000000-0000-0000-0000-000000000001")
	acc1 := uuid.MustParse("20000000-0000-0000-0000-000000000001")
	acc2 := uuid.MustParse("20000000-0000-0000-0000-000000000002")
	asOf := time.Date(2026, 2, 26, 0, 0, 0, 0, time.UTC)

	uc := NewUseCase(
		&fakeBankAccountRepo{list: func(ctx context.Context, tid uuid.UUID, limit, offset int) ([]domain.BankAccount, int, error) {
			return []domain.BankAccount{
				{ID: acc1, TenantID: tenantID, Nickname: "SNB Main", Currency: "SAR"},
				{ID: acc2, TenantID: tenantID, Nickname: "Dubai Acc", Currency: "AED"},
			}, 2, nil
		}},
		nil,
		&fakeBankTxnRepo{sum: func(ctx context.Context, tid uuid.UUID, as time.Time) (map[uuid.UUID]float64, error) {
			return map[uuid.UUID]float64{
				acc1: 8600000,
				acc2: 320000,
			}, nil
		}},
		nil,
		nil,
		nil,
	)

	pos, err := uc.GetCashPosition(context.Background(), tenantID, asOf)
	if err != nil {
		t.Fatalf("GetCashPosition: %v", err)
	}
	if len(pos.Accounts) != 2 {
		t.Fatalf("accounts: got %d", len(pos.Accounts))
	}
	if pos.Accounts[0].Balance != 8600000 || pos.Accounts[0].Currency != "SAR" {
		t.Errorf("account 0: balance=%f currency=%s", pos.Accounts[0].Balance, pos.Accounts[0].Currency)
	}
	if pos.Accounts[1].Balance != 320000 || pos.Accounts[1].Currency != "AED" {
		t.Errorf("account 1: balance=%f currency=%s", pos.Accounts[1].Balance, pos.Accounts[1].Currency)
	}
	if len(pos.Totals.ByCurrency) != 2 {
		t.Fatalf("totals.byCurrency: got %d", len(pos.Totals.ByCurrency))
	}
	var sarTotal, aedTotal float64
	for _, c := range pos.Totals.ByCurrency {
		if c.Currency == "SAR" {
			sarTotal = c.Balance
		}
		if c.Currency == "AED" {
			aedTotal = c.Balance
		}
	}
	if sarTotal != 8600000 || aedTotal != 320000 {
		t.Errorf("totals: SAR=%f AED=%f", sarTotal, aedTotal)
	}
}

type fakeBankAccountRepo struct {
	list func(context.Context, uuid.UUID, int, int) ([]domain.BankAccount, int, error)
}

func (f *fakeBankAccountRepo) Create(ctx context.Context, tenantID uuid.UUID, input domain.CreateBankAccountInput) (*domain.BankAccount, error) {
	return nil, nil
}
func (f *fakeBankAccountRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.BankAccount, error) {
	return nil, nil
}
func (f *fakeBankAccountRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.BankAccount, int, error) {
	return f.list(ctx, tenantID, limit, offset)
}

type fakeBankTxnRepo struct {
	sum func(context.Context, uuid.UUID, time.Time) (map[uuid.UUID]float64, error)
}

func (f *fakeBankTxnRepo) BulkUpsert(ctx context.Context, tenantID uuid.UUID, txns []domain.BankTransaction) (int, error) {
	return 0, nil
}
func (f *fakeBankTxnRepo) List(ctx context.Context, filter domain.TransactionFilter) ([]domain.BankTransaction, int, error) {
	return nil, 0, nil
}
func (f *fakeBankTxnRepo) SumBalancesByAccountUpTo(ctx context.Context, tenantID uuid.UUID, asOf time.Time) (map[uuid.UUID]float64, error) {
	return f.sum(ctx, tenantID, asOf)
}
