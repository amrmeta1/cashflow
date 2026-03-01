package ingestion

import (
	"context"
	"crypto/sha256"
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/adapter/mq"
	"github.com/finch-co/cashflow/internal/domain"
)

// UseCase handles financial data ingestion workflows (CSV import, bank sync, cash position).
// This package is a bounded context for the ingestion service; it can be extracted
// into a separate service later with minimal change.
type UseCase struct {
	bankAccounts domain.BankAccountRepository
	rawTxns      domain.RawBankTransactionRepository
	txns         domain.BankTransactionRepository
	jobs         domain.IngestionJobRepository
	idempotency  domain.IdempotencyRepository
	publisher    *mq.Publisher
}

// NewUseCase creates a new ingestion use case.
func NewUseCase(
	bankAccounts domain.BankAccountRepository,
	rawTxns domain.RawBankTransactionRepository,
	txns domain.BankTransactionRepository,
	jobs domain.IngestionJobRepository,
	idempotency domain.IdempotencyRepository,
	publisher *mq.Publisher,
) *UseCase {
	return &UseCase{
		bankAccounts: bankAccounts,
		rawTxns:      rawTxns,
		txns:         txns,
		jobs:         jobs,
		idempotency:  idempotency,
		publisher:    publisher,
	}
}

// CSVImportResult holds the result of a CSV import operation.
type CSVImportResult struct {
	JobID       uuid.UUID `json:"job_id"`
	TotalRows   int       `json:"total_rows"`
	Inserted    int       `json:"inserted"`
	Duplicates  int       `json:"duplicates"`
	Errors      int       `json:"errors"`
	ErrorDetail []string  `json:"error_detail,omitempty"`
}

// ImportBankCSV processes a CSV file upload containing bank transactions.
// Expected CSV columns: date, amount, currency, description, counterparty, category
func (uc *UseCase) ImportBankCSV(ctx context.Context, tenantID, accountID uuid.UUID, reader io.Reader) (*CSVImportResult, error) {
	_, err := uc.bankAccounts.GetByID(ctx, tenantID, accountID)
	if err != nil {
		return nil, fmt.Errorf("bank account not found: %w", err)
	}

	job, err := uc.jobs.Create(ctx, tenantID, domain.CreateIngestionJobInput{
		JobType: "csv_import",
		Metadata: map[string]any{
			"account_id": accountID.String(),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("creating ingestion job: %w", err)
	}

	_ = uc.jobs.UpdateStatus(ctx, job.ID, domain.JobStatusRunning, "")

	result := &CSVImportResult{JobID: job.ID}

	csvReader := csv.NewReader(reader)
	csvReader.TrimLeadingSpace = true

	header, err := csvReader.Read()
	if err != nil {
		_ = uc.jobs.UpdateStatus(ctx, job.ID, domain.JobStatusFailed, "failed to read CSV header")
		return nil, fmt.Errorf("reading CSV header: %w", err)
	}

	colMap := buildColumnMap(header)

	required := []string{"date", "amount"}
	for _, col := range required {
		if _, ok := colMap[col]; !ok {
			errMsg := fmt.Sprintf("missing required column: %s", col)
			_ = uc.jobs.UpdateStatus(ctx, job.ID, domain.JobStatusFailed, errMsg)
			return nil, fmt.Errorf("%w: %s", domain.ErrValidation, errMsg)
		}
	}

	var rawPayloads []map[string]any
	var normalizedTxns []domain.BankTransaction
	lineNum := 1

	for {
		lineNum++
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Errors++
			result.ErrorDetail = append(result.ErrorDetail, fmt.Sprintf("line %d: %s", lineNum, err.Error()))
			continue
		}

		result.TotalRows++

		rawPayload := make(map[string]any)
		for i, val := range record {
			if i < len(header) {
				rawPayload[header[i]] = val
			}
		}
		rawPayloads = append(rawPayloads, rawPayload)

		txn, err := parseCSVRow(record, colMap, tenantID, accountID)
		if err != nil {
			result.Errors++
			result.ErrorDetail = append(result.ErrorDetail, fmt.Sprintf("line %d: %s", lineNum, err.Error()))
			continue
		}
		normalizedTxns = append(normalizedTxns, *txn)
	}

	if len(normalizedTxns) == 0 {
		_ = uc.jobs.UpdateStatus(ctx, job.ID, domain.JobStatusCompleted, "")
		return result, nil
	}

	rawIDs, err := uc.rawTxns.BulkCreate(ctx, tenantID, "csv", rawPayloads)
	if err != nil {
		log.Error().Err(err).Msg("failed to store raw transactions")
	} else {
		for i := range normalizedTxns {
			if i < len(rawIDs) {
				id := rawIDs[i]
				normalizedTxns[i].RawID = &id
			}
		}
	}

	inserted, err := uc.txns.BulkUpsert(ctx, tenantID, normalizedTxns)
	if err != nil {
		_ = uc.jobs.UpdateStatus(ctx, job.ID, domain.JobStatusFailed, err.Error())
		return nil, fmt.Errorf("upserting transactions: %w", err)
	}

	result.Inserted = inserted
	result.Duplicates = len(normalizedTxns) - inserted - result.Errors

	_ = uc.jobs.UpdateStatus(ctx, job.ID, domain.JobStatusCompleted, "")

	if inserted > 0 {
		env, err := mq.NewEnvelope(mq.RKTransactionsIngested, tenantID.String(), map[string]any{
			"job_id":     job.ID.String(),
			"account_id": accountID.String(),
			"count":      inserted,
		})
		if err == nil {
			if pubErr := uc.publisher.PublishEvent(ctx, mq.RKTransactionsIngested, env); pubErr != nil {
				log.Error().Err(pubErr).Str("job_id", job.ID.String()).Msg("failed to publish transactions.ingested event")
			}
		}
	}

	return result, nil
}

// ListTransactions retrieves bank transactions for a tenant with filters.
func (uc *UseCase) ListTransactions(ctx context.Context, filter domain.TransactionFilter) ([]domain.BankTransaction, int, error) {
	return uc.txns.List(ctx, filter)
}

// CreateBankAccount registers a new bank account for a tenant.
func (uc *UseCase) CreateBankAccount(ctx context.Context, tenantID uuid.UUID, input domain.CreateBankAccountInput) (*domain.BankAccount, error) {
	if input.Currency == "" {
		input.Currency = "SAR"
	}
	if input.Provider == "" {
		input.Provider = "manual"
	}
	return uc.bankAccounts.Create(ctx, tenantID, input)
}

// EnqueueSyncBank publishes a sync_bank command to RabbitMQ.
func (uc *UseCase) EnqueueSyncBank(ctx context.Context, tenantID uuid.UUID) (*domain.IngestionJob, error) {
	job, err := uc.jobs.Create(ctx, tenantID, domain.CreateIngestionJobInput{
		JobType: "sync_bank",
	})
	if err != nil {
		return nil, fmt.Errorf("creating sync_bank job: %w", err)
	}

	env, err := mq.NewEnvelope(mq.RKIngestionSyncBank, tenantID.String(), map[string]any{
		"job_id": job.ID.String(),
	})
	if err != nil {
		return nil, fmt.Errorf("creating envelope: %w", err)
	}

	if err := uc.publisher.PublishCommand(ctx, mq.RKIngestionSyncBank, env); err != nil {
		_ = uc.jobs.UpdateStatus(ctx, job.ID, domain.JobStatusFailed, "failed to enqueue")
		return nil, fmt.Errorf("publishing sync_bank command: %w", err)
	}

	return job, nil
}

// EnqueueSyncAccounting publishes a sync_accounting command to RabbitMQ.
func (uc *UseCase) EnqueueSyncAccounting(ctx context.Context, tenantID uuid.UUID) (*domain.IngestionJob, error) {
	job, err := uc.jobs.Create(ctx, tenantID, domain.CreateIngestionJobInput{
		JobType: "sync_accounting",
	})
	if err != nil {
		return nil, fmt.Errorf("creating sync_accounting job: %w", err)
	}

	env, err := mq.NewEnvelope(mq.RKIngestionSyncAccounting, tenantID.String(), map[string]any{
		"job_id": job.ID.String(),
	})
	if err != nil {
		return nil, fmt.Errorf("creating envelope: %w", err)
	}

	if err := uc.publisher.PublishCommand(ctx, mq.RKIngestionSyncAccounting, env); err != nil {
		_ = uc.jobs.UpdateStatus(ctx, job.ID, domain.JobStatusFailed, "failed to enqueue")
		return nil, fmt.Errorf("publishing sync_accounting command: %w", err)
	}

	return job, nil
}

// GetCashPosition returns the cash position for a tenant as of a given date.
func (uc *UseCase) GetCashPosition(ctx context.Context, tenantID uuid.UUID, asOf time.Time) (*domain.CashPositionResponse, error) {
	accounts, _, err := uc.bankAccounts.ListByTenant(ctx, tenantID, 500, 0)
	if err != nil {
		return nil, fmt.Errorf("listing bank accounts: %w", err)
	}

	balances, err := uc.txns.SumBalancesByAccountUpTo(ctx, tenantID, asOf)
	if err != nil {
		return nil, fmt.Errorf("summing balances: %w", err)
	}

	asOfDate := asOf.Truncate(24 * time.Hour)
	resp := &domain.CashPositionResponse{
		TenantID:     tenantID.String(),
		AsOf:         asOfDate.Format("2006-01-02"),
		CurrencyMode: "native",
		Accounts:     make([]domain.CashPositionAccount, 0, len(accounts)),
		Totals:       domain.CashPositionTotals{ByCurrency: []domain.CashPositionTotalByCurrency{}},
	}

	totalsByCurrency := make(map[string]float64)
	for _, acc := range accounts {
		bal := balances[acc.ID]
		resp.Accounts = append(resp.Accounts, domain.CashPositionAccount{
			AccountID: acc.ID,
			Name:      acc.Nickname,
			Currency:  acc.Currency,
			Balance:   bal,
		})
		totalsByCurrency[acc.Currency] += bal
	}
	for currency, balance := range totalsByCurrency {
		resp.Totals.ByCurrency = append(resp.Totals.ByCurrency, domain.CashPositionTotalByCurrency{
			Currency: currency,
			Balance:  balance,
		})
	}

	return resp, nil
}

func buildColumnMap(header []string) map[string]int {
	m := make(map[string]int, len(header))
	for i, col := range header {
		m[strings.TrimSpace(strings.ToLower(col))] = i
	}
	return m
}

func parseCSVRow(record []string, colMap map[string]int, tenantID, accountID uuid.UUID) (*domain.BankTransaction, error) {
	getCol := func(name string) string {
		if idx, ok := colMap[name]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	dateStr := getCol("date")
	amountStr := getCol("amount")
	currency := getCol("currency")
	description := getCol("description")
	counterparty := getCol("counterparty")
	category := getCol("category")

	var txnDate time.Time
	var err error
	for _, layout := range []string{"2006-01-02", "02/01/2006", "01/02/2006", "2006/01/02"} {
		txnDate, err = time.Parse(layout, dateStr)
		if err == nil {
			break
		}
	}
	if err != nil {
		return nil, fmt.Errorf("invalid date %q", dateStr)
	}

	amount, err := strconv.ParseFloat(strings.ReplaceAll(amountStr, ",", ""), 64)
	if err != nil {
		return nil, fmt.Errorf("invalid amount %q", amountStr)
	}

	if currency == "" {
		currency = "SAR"
	}
	if category == "" {
		category = "uncategorized"
	}

	hash := computeTransactionHash(accountID.String(), dateStr, amountStr, description, counterparty)

	return &domain.BankTransaction{
		TenantID:     tenantID,
		AccountID:    accountID,
		TxnDate:      txnDate,
		Amount:       amount,
		Currency:     currency,
		Description:  description,
		Counterparty: counterparty,
		Category:     category,
		Hash:         hash,
	}, nil
}

func computeTransactionHash(accountID, date, amount, description, counterparty string) string {
	raw := strings.Join([]string{accountID, date, amount, description, counterparty}, "|")
	h := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("%x", h)
}
