package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"tadfuq/rag-service/internal/domain/insights"
)

// InsightsStore implements domain/insights.InsightsRepository against PostgreSQL.
// It shares the same *sql.DB connection as RAGStore but is a separate type —
// zero coupling between the RAG and Insights Engine data layers.
type InsightsStore struct {
	db *sql.DB
}

// NewInsightsStore reuses an existing *sql.DB (avoids a second connection pool).
func NewInsightsStore(db *sql.DB) *InsightsStore {
	return &InsightsStore{db: db}
}

// NewInsightsStoreFromDSN opens its own connection pool.
func NewInsightsStoreFromDSN(dsn string) (*InsightsStore, error) {
	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("InsightsStore: open: %w", err)
	}
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("InsightsStore: ping: %w", err)
	}
	conn.SetMaxOpenConns(10)
	conn.SetMaxIdleConns(3)
	conn.SetConnMaxLifetime(5 * time.Minute)
	return &InsightsStore{db: conn}, nil
}

// ── GetTransactions ────────────────────────────────────────────────────────────

// GetTransactions returns bank transactions for tenantID in [from, to],
// ordered by txn_date DESC.  All tenant-scoped via WHERE tenant_id = $1.
func (s *InsightsStore) GetTransactions(
	ctx context.Context,
	tenantID uuid.UUID,
	from, to time.Time,
) ([]insights.BankTransaction, error) {
	const q = `
		SELECT id, tenant_id, txn_date, amount, txn_type,
		       description, category, balance_after, COALESCE(reference, '')
		FROM   bank_transactions
		WHERE  tenant_id = $1          /* tenant isolation */
		  AND  txn_date  BETWEEN $2 AND $3
		ORDER  BY txn_date DESC`

	rows, err := s.db.QueryContext(ctx, q, tenantID, from, to)
	if err != nil {
		return nil, fmt.Errorf("InsightsStore.GetTransactions: %w", err)
	}
	defer rows.Close()

	var txns []insights.BankTransaction
	for rows.Next() {
		var t insights.BankTransaction
		var txnType string
		if err := rows.Scan(
			&t.ID, &t.TenantID, &t.Date, &t.Amount, &txnType,
			&t.Description, &t.Category, &t.BalanceAfter, &t.Reference,
		); err != nil {
			return nil, err
		}
		t.Type = insights.TransactionType(txnType)
		txns = append(txns, t)
	}
	return txns, rows.Err()
}

// ── GetLatestForecast ──────────────────────────────────────────────────────────

// GetLatestForecast returns the 13 entries of the most recent forecast run
// for tenantID, ordered by week_number ASC.
func (s *InsightsStore) GetLatestForecast(
	ctx context.Context,
	tenantID uuid.UUID,
) ([]insights.ForecastEntry, error) {

	// Step 1: find the latest forecast_run_id for the tenant
	var runID uuid.UUID
	err := s.db.QueryRowContext(ctx, `
		SELECT forecast_run_id
		FROM   forecast_entries
		WHERE  tenant_id = $1          /* tenant isolation */
		ORDER  BY created_at DESC
		LIMIT  1`,
		tenantID,
	).Scan(&runID)

	if err == sql.ErrNoRows {
		return nil, nil // no forecast yet — engine runs without it
	}
	if err != nil {
		return nil, fmt.Errorf("InsightsStore.GetLatestForecast (run id): %w", err)
	}

	// Step 2: fetch all 13 weeks for that run
	const q = `
		SELECT id, tenant_id, forecast_run_id, week_number, week_start_date,
		       forecasted_inflow, forecasted_outflow, forecasted_net,
		       forecasted_ending_balance
		FROM   forecast_entries
		WHERE  tenant_id       = $1   /* tenant isolation */
		  AND  forecast_run_id = $2
		ORDER  BY week_number ASC`

	rows, err := s.db.QueryContext(ctx, q, tenantID, runID)
	if err != nil {
		return nil, fmt.Errorf("InsightsStore.GetLatestForecast: %w", err)
	}
	defer rows.Close()

	var entries []insights.ForecastEntry
	for rows.Next() {
		var e insights.ForecastEntry
		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.ForecastRunID, &e.WeekNumber, &e.WeekStartDate,
			&e.ForecastedInflow, &e.ForecastedOutflow, &e.ForecastedNet,
			&e.ForecastedEndingBalance,
		); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// ── GetActiveAlerts ────────────────────────────────────────────────────────────

// GetActiveAlerts returns all unresolved alerts for the tenant,
// ordered by triggered_at DESC.
func (s *InsightsStore) GetActiveAlerts(
	ctx context.Context,
	tenantID uuid.UUID,
) ([]insights.Alert, error) {
	const q = `
		SELECT id, tenant_id, alert_type, severity, title, message,
		       details, triggered_at, resolved_at, is_active
		FROM   alerts
		WHERE  tenant_id = $1   /* tenant isolation */
		  AND  is_active = TRUE
		ORDER  BY triggered_at DESC`

	rows, err := s.db.QueryContext(ctx, q, tenantID)
	if err != nil {
		return nil, fmt.Errorf("InsightsStore.GetActiveAlerts: %w", err)
	}
	defer rows.Close()

	var alerts []insights.Alert
	for rows.Next() {
		var a insights.Alert
		var details []byte
		var resolvedAt sql.NullTime
		var severityStr string

		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.AlertType, &severityStr, &a.Title, &a.Message,
			&details, &a.TriggeredAt, &resolvedAt, &a.IsActive,
		); err != nil {
			return nil, err
		}
		a.Severity = insights.AlertSeverity(severityStr)
		if resolvedAt.Valid {
			t := resolvedAt.Time
			a.ResolvedAt = &t
		}
		if err := json.Unmarshal(details, &a.Details); err != nil {
			a.Details = map[string]any{}
		}
		alerts = append(alerts, a)
	}
	return alerts, rows.Err()
}
