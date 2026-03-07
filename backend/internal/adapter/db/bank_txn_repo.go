package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/domain"
)

type BankTransactionRepo struct {
	pool *pgxpool.Pool
}

func NewBankTransactionRepo(pool *pgxpool.Pool) *BankTransactionRepo {
	return &BankTransactionRepo{pool: pool}
}

var _ domain.TransactionRepository = (*BankTransactionRepo)(nil)

func (r *BankTransactionRepo) BulkUpsert(ctx context.Context, tenantID uuid.UUID, txns []domain.BankTransaction) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback(ctx)

	inserted := 0
	for _, t := range txns {
		tag, err := tx.Exec(ctx, `
			INSERT INTO bank_transactions (tenant_id, account_id, txn_date, amount, currency, description, counterparty, category, hash, raw_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (tenant_id, hash) DO NOTHING`,
			tenantID, t.AccountID, t.TxnDate, t.Amount, t.Currency,
			t.Description, t.Counterparty, t.Category, t.Hash, t.RawID,
		)
		if err != nil {
			return 0, fmt.Errorf("upserting transaction: %w", err)
		}
		if tag.RowsAffected() > 0 {
			inserted++
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("committing transactions: %w", err)
	}
	return inserted, nil
}

func (r *BankTransactionRepo) List(ctx context.Context, filter domain.TransactionFilter) ([]domain.BankTransaction, int, error) {
	// Build WHERE clause dynamically
	args := []any{filter.TenantID}
	where := "WHERE tenant_id = $1"
	argIdx := 2

	if filter.AccountID != nil {
		where += fmt.Sprintf(" AND account_id = $%d", argIdx)
		args = append(args, *filter.AccountID)
		argIdx++
	}
	if filter.From != nil {
		where += fmt.Sprintf(" AND txn_date >= $%d", argIdx)
		args = append(args, *filter.From)
		argIdx++
	}
	if filter.To != nil {
		where += fmt.Sprintf(" AND txn_date <= $%d", argIdx)
		args = append(args, *filter.To)
		argIdx++
	}

	// Count
	var total int
	countQuery := "SELECT COUNT(*) FROM bank_transactions " + where
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting transactions: %w", err)
	}

	// Fetch
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	listQuery := fmt.Sprintf(`
		SELECT id, tenant_id, account_id, txn_date, amount, currency, description, counterparty, category, hash, raw_id, created_at
		FROM bank_transactions
		%s
		ORDER BY txn_date DESC, created_at DESC
		LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("listing transactions: %w", err)
	}
	defer rows.Close()

	var txns []domain.BankTransaction
	for rows.Next() {
		var t domain.BankTransaction
		var txnDate time.Time
		if err := rows.Scan(
			&t.ID, &t.TenantID, &t.AccountID, &txnDate,
			&t.Amount, &t.Currency, &t.Description, &t.Counterparty,
			&t.Category, &t.Hash, &t.RawID, &t.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scanning transaction: %w", err)
		}
		t.TxnDate = txnDate
		txns = append(txns, t)
	}

	return txns, total, nil
}

// SumBalancesByAccountUpTo returns per-account sum of transaction amounts with txn_date <= asOf (inclusive).
func (r *BankTransactionRepo) SumBalancesByAccountUpTo(ctx context.Context, tenantID uuid.UUID, asOf time.Time) (map[uuid.UUID]float64, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT account_id, COALESCE(SUM(amount), 0)
		FROM bank_transactions
		WHERE tenant_id = $1 AND txn_date <= $2
		GROUP BY account_id`,
		tenantID, asOf,
	)
	if err != nil {
		return nil, fmt.Errorf("summing balances: %w", err)
	}
	defer rows.Close()

	out := make(map[uuid.UUID]float64)
	for rows.Next() {
		var id uuid.UUID
		var sum float64
		if err := rows.Scan(&id, &sum); err != nil {
			return nil, fmt.Errorf("scanning balance row: %w", err)
		}
		out[id] = sum
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating balance rows: %w", err)
	}
	return out, nil
}

// GetCurrentCash returns the tenant's summed balance up to now.
func (r *BankTransactionRepo) GetCurrentCash(ctx context.Context, tenantID uuid.UUID) (float64, error) {
	asOf := time.Now().UTC()

	var currentCash float64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount), 0)
		FROM bank_transactions
		WHERE tenant_id = $1
		  AND txn_date <= $2`,
		tenantID, asOf,
	).Scan(&currentCash)
	if err != nil {
		return 0, fmt.Errorf("getting current cash: %w", err)
	}

	return currentCash, nil
}

// GetLastNDaysSummary returns inflow/outflow totals and daily averages over the trailing N-day window.
func (r *BankTransactionRepo) GetLastNDaysSummary(ctx context.Context, tenantID uuid.UUID, days int) (*domain.CashSummary, error) {
	if days <= 0 {
		return nil, fmt.Errorf("days must be greater than zero")
	}

	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -days)

	summary := &domain.CashSummary{}
	err := r.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_inflow,
			COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS total_outflow
		FROM bank_transactions
		WHERE tenant_id = $1
		  AND txn_date >= $2
		  AND txn_date <= $3`,
		tenantID, startDate, endDate,
	).Scan(&summary.TotalInflow, &summary.TotalOutflow)
	if err != nil {
		return nil, fmt.Errorf("getting last n days summary: %w", err)
	}

	summary.AvgDailyInflow = summary.TotalInflow / float64(days)
	summary.AvgDailyOutflow = summary.TotalOutflow / float64(days)

	return summary, nil
}
