package repositories

import (
"encoding/json"
"github.com/finch-co/cashflow/internal/models"
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RawBankTransactionRepo struct {
	pool *pgxpool.Pool
}

func NewRawBankTransactionRepo(pool *pgxpool.Pool) *RawBankTransactionRepo {
	return &RawBankTransactionRepo{pool: pool}
}

func (r *RawBankTransactionRepo) Create(ctx context.Context, tenantID uuid.UUID, source string, payload map[string]any) (*models.RawBankTransaction, error) {
	var raw models.RawBankTransaction
	err := r.pool.QueryRow(ctx, `
		INSERT INTO raw_bank_transactions (tenant_id, source, raw_payload)
		VALUES ($1, $2, $3)
		RETURNING id, tenant_id, source, raw_payload, imported_at`,
		tenantID, source, func() []byte { b, _ := json.Marshal(payload); return b }(),
	).Scan(&raw.ID, &raw.TenantID, &raw.Source, &raw.RawPayload, &raw.ImportedAt)
	if err != nil {
		return nil, fmt.Errorf("creating raw bank transaction: %w", err)
	}
	return &raw, nil
}

func (r *RawBankTransactionRepo) BulkCreate(ctx context.Context, tenantID uuid.UUID, source string, payloads []map[string]any) ([]uuid.UUID, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback(ctx)

	ids := make([]uuid.UUID, 0, len(payloads))
	for _, payload := range payloads {
		var id uuid.UUID
		err := tx.QueryRow(ctx, `
			INSERT INTO raw_bank_transactions (tenant_id, source, raw_payload)
			VALUES ($1, $2, $3)
			RETURNING id`,
			tenantID, source, func() []byte { b, _ := json.Marshal(payload); return b }(),
		).Scan(&id)
		if err != nil {
			return nil, fmt.Errorf("inserting raw txn: %w", err)
		}
		ids = append(ids, id)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("committing raw txns: %w", err)
	}
	return ids, nil
}
