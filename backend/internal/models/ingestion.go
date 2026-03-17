package models

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ── Bank Account ────────────────────────────────

type BankAccountStatus string

const (
	BankAccountActive   BankAccountStatus = "active"
	BankAccountInactive BankAccountStatus = "inactive"
	BankAccountError    BankAccountStatus = "error"
)

type BankAccount struct {
	ID         uuid.UUID         `json:"id"`
	TenantID   uuid.UUID         `json:"tenant_id"`
	Provider   string            `json:"provider"`
	ExternalID string            `json:"external_id,omitempty"`
	Currency   string            `json:"currency"`
	Nickname   string            `json:"nickname"`
	Status     BankAccountStatus `json:"status"`
	Metadata   map[string]any    `json:"metadata,omitempty"`
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`
}

type CreateBankAccountInput struct {
	Provider   string         `json:"provider"`
	ExternalID string         `json:"external_id,omitempty"`
	Currency   string         `json:"currency"`
	Nickname   string         `json:"nickname"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

// ── Raw Bank Transaction ────────────────────────

type RawBankTransaction struct {
	ID         uuid.UUID      `json:"id"`
	TenantID   uuid.UUID      `json:"tenant_id"`
	Source     string         `json:"source"`
	RawPayload map[string]any `json:"raw_payload"`
	ImportedAt time.Time      `json:"imported_at"`
}

// ── Bank Transaction (normalized) ───────────────

type BankTransaction struct {
	ID           uuid.UUID  `json:"id"`
	TenantID     uuid.UUID  `json:"tenant_id"`
	AccountID    uuid.UUID  `json:"account_id"`
	TxnDate      time.Time  `json:"txn_date"`
	Amount       float64    `json:"amount"`
	Currency     string     `json:"currency"`
	Description  string     `json:"description"`
	Counterparty string     `json:"counterparty"`
	Category     string     `json:"category"`
	Hash         string     `json:"hash"`
	RawID        *uuid.UUID `json:"raw_id,omitempty"`
	VendorID     *uuid.UUID `json:"vendor_id,omitempty"`

	// AI Classification fields
	AIVendorName *string `json:"ai_vendor_name,omitempty"`
	AICategory   *string `json:"ai_category,omitempty"`
	AIConfidence float64 `json:"ai_confidence"`
	AIClassified bool    `json:"ai_classified"`

	CreatedAt time.Time `json:"created_at"`
}

type TransactionFilter struct {
	TenantID  uuid.UUID
	AccountID *uuid.UUID
	From      *time.Time
	To        *time.Time
	Limit     int
	Offset    int
}

// ── Ingestion Job ───────────────────────────────

type JobStatus string

const (
	JobStatusPending   JobStatus = "pending"
	JobStatusRunning   JobStatus = "running"
	JobStatusCompleted JobStatus = "completed"
	JobStatusFailed    JobStatus = "failed"
)

type IngestionJob struct {
	ID          uuid.UUID      `json:"id"`
	TenantID    uuid.UUID      `json:"tenant_id"`
	JobType     string         `json:"job_type"`
	Status      JobStatus      `json:"status"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	ScheduledAt time.Time      `json:"scheduled_at"`
	StartedAt   *time.Time     `json:"started_at,omitempty"`
	FinishedAt  *time.Time     `json:"finished_at,omitempty"`
	Error       string         `json:"error,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
}

type CreateIngestionJobInput struct {
	JobType  string         `json:"job_type"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

// ── Idempotency ─────────────────────────────────

type IdempotencyKey struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenant_id"`
	Key       string    `json:"key"`
	Scope     string    `json:"scope"`
	CreatedAt time.Time `json:"created_at"`
}

// ── Ingestion Repositories ──────────────────────

type BankAccountRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID, input CreateBankAccountInput) (*BankAccount, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*BankAccount, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]BankAccount, int, error)
}

type RawBankTransactionRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID, source string, payload map[string]any) (*RawBankTransaction, error)
	BulkCreate(ctx context.Context, tenantID uuid.UUID, source string, payloads []map[string]any) ([]uuid.UUID, error)
}

type BankTransactionRepository interface {
	BulkUpsert(ctx context.Context, tenantID uuid.UUID, txns []BankTransaction) (inserted int, err error)
	List(ctx context.Context, filter TransactionFilter) ([]BankTransaction, int, error)
	// SumBalancesByAccountUpTo returns per-account sum of transaction amounts with txn_date <= asOf (inclusive).
	SumBalancesByAccountUpTo(ctx context.Context, tenantID uuid.UUID, asOf time.Time) (map[uuid.UUID]float64, error)

	// AI Classification methods
	GetUnclassifiedTransactions(ctx context.Context, tenantID uuid.UUID, limit int) ([]BankTransaction, error)
	UpdateClassification(ctx context.Context, txnID uuid.UUID, vendorName, category string, confidence float64) error
	BulkUpdateClassifications(ctx context.Context, classifications []TransactionClassification) error
}

// TransactionClassification holds AI classification data for a transaction
type TransactionClassification struct {
	ID         uuid.UUID
	VendorName string
	Category   string
	Confidence float64
}

// CashPositionAccount is one account in a cash position response.
type CashPositionAccount struct {
	AccountID uuid.UUID `json:"accountId"`
	Name      string    `json:"name"`
	Currency  string    `json:"currency"`
	Balance   float64   `json:"balance"`
}

// CashPositionTotalByCurrency is a total in one currency.
type CashPositionTotalByCurrency struct {
	Currency string  `json:"currency"`
	Balance  float64 `json:"balance"`
}

// CashPositionResponse is the response for GET /tenants/{id}/cash-position.
type CashPositionResponse struct {
	TenantID     string                `json:"tenantId"`
	AsOf         string                `json:"asOf"` // YYYY-MM-DD
	CurrencyMode string                `json:"currencyMode"`
	Accounts     []CashPositionAccount `json:"accounts"`
	Totals       CashPositionTotals    `json:"totals"`
}

// CashPositionTotals holds totals by currency.
type CashPositionTotals struct {
	ByCurrency []CashPositionTotalByCurrency `json:"byCurrency"`
}

type IngestionJobRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID, input CreateIngestionJobInput) (*IngestionJob, error)
	GetByID(ctx context.Context, id uuid.UUID) (*IngestionJob, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status JobStatus, errMsg string) error
}

type IdempotencyRepository interface {
	Exists(ctx context.Context, tenantID uuid.UUID, key, scope string) (bool, error)
	Create(ctx context.Context, tenantID uuid.UUID, key, scope string) error
}

// ── Ingestion Audit Actions ─────────────────────

const (
	AuditCSVImported         = "csv_imported"
	AuditBankAccountCreated  = "bank_account_created"
	AuditSyncBankEnqueued    = "sync_bank_enqueued"
	AuditSyncAccountEnqueued = "sync_accounting_enqueued"
)
