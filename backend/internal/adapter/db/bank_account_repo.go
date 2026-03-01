package db

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/domain"
)

type BankAccountRepo struct {
	pool *pgxpool.Pool
}

func NewBankAccountRepo(pool *pgxpool.Pool) *BankAccountRepo {
	return &BankAccountRepo{pool: pool}
}

func (r *BankAccountRepo) Create(ctx context.Context, tenantID uuid.UUID, input domain.CreateBankAccountInput) (*domain.BankAccount, error) {
	var ba domain.BankAccount
	err := r.pool.QueryRow(ctx, `
		INSERT INTO bank_accounts (tenant_id, provider, external_id, currency, nickname, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, tenant_id, provider, external_id, currency, nickname, status, metadata, created_at, updated_at`,
		tenantID, input.Provider, input.ExternalID, input.Currency, input.Nickname, mapToJSON(input.Metadata),
	).Scan(
		&ba.ID, &ba.TenantID, &ba.Provider, &ba.ExternalID,
		&ba.Currency, &ba.Nickname, &ba.Status, &ba.Metadata,
		&ba.CreatedAt, &ba.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating bank account: %w", err)
	}
	return &ba, nil
}

func (r *BankAccountRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.BankAccount, error) {
	var ba domain.BankAccount
	err := r.pool.QueryRow(ctx, `
		SELECT id, tenant_id, provider, external_id, currency, nickname, status, metadata, created_at, updated_at
		FROM bank_accounts
		WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	).Scan(
		&ba.ID, &ba.TenantID, &ba.Provider, &ba.ExternalID,
		&ba.Currency, &ba.Nickname, &ba.Status, &ba.Metadata,
		&ba.CreatedAt, &ba.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("getting bank account: %w", err)
	}
	return &ba, nil
}

func (r *BankAccountRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.BankAccount, int, error) {
	var total int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM bank_accounts WHERE tenant_id = $1`, tenantID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting bank accounts: %w", err)
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id, tenant_id, provider, external_id, currency, nickname, status, metadata, created_at, updated_at
		FROM bank_accounts
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`,
		tenantID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("listing bank accounts: %w", err)
	}
	defer rows.Close()

	var accounts []domain.BankAccount
	for rows.Next() {
		var ba domain.BankAccount
		if err := rows.Scan(
			&ba.ID, &ba.TenantID, &ba.Provider, &ba.ExternalID,
			&ba.Currency, &ba.Nickname, &ba.Status, &ba.Metadata,
			&ba.CreatedAt, &ba.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scanning bank account: %w", err)
		}
		accounts = append(accounts, ba)
	}

	return accounts, total, nil
}
