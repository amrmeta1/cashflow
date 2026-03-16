package service

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/events"
	"github.com/finch-co/cashflow/internal/ingestion/detector"
	"github.com/finch-co/cashflow/internal/ingestion/normalizer"
	"github.com/finch-co/cashflow/internal/ingestion/parsers"
	dbmodels "github.com/finch-co/cashflow/internal/models"
	"github.com/finch-co/cashflow/internal/shared/errors"
	"github.com/finch-co/cashflow/internal/shared/observability"
	"github.com/finch-co/cashflow/internal/shared/retry"
)

// IngestionService handles file ingestion with the new modular architecture.
type IngestionService struct {
	// Repositories
	bankAccounts dbmodels.BankAccountRepository
	rawTxns      dbmodels.RawBankTransactionRepository
	txns         dbmodels.BankTransactionRepository
	jobs         dbmodels.IngestionJobRepository
	vendors      dbmodels.VendorRepository

	// Components
	detector   *detector.DocumentDetector
	normalizer *normalizer.TransactionNormalizer
	publisher  *events.Publisher

	// Configuration
	retryConfig retry.Config
}

// NewIngestionService creates a new ingestion service.
func NewIngestionService(
	bankAccounts dbmodels.BankAccountRepository,
	rawTxns dbmodels.RawBankTransactionRepository,
	txns dbmodels.BankTransactionRepository,
	jobs dbmodels.IngestionJobRepository,
	vendors dbmodels.VendorRepository,
	publisher *events.Publisher,
) *IngestionService {
	return &IngestionService{
		bankAccounts: bankAccounts,
		rawTxns:      rawTxns,
		txns:         txns,
		jobs:         jobs,
		vendors:      vendors,
		detector:     detector.NewDocumentDetector(),
		normalizer:   normalizer.NewTransactionNormalizer(vendors),
		publisher:    publisher,
		retryConfig:  retry.DefaultConfig(),
	}
}

// ImportResult contains the results of an import operation.
type ImportResult struct {
	JobID                uuid.UUID
	TotalRows            int
	TransactionsParsed   int
	TransactionsInserted int
	Duplicates           int
	Errors               []string
	DocumentType         string
	Duration             time.Duration
}

// ImportCSV imports transactions from a CSV file.
func (s *IngestionService) ImportCSV(
	ctx context.Context,
	tenantID, accountID uuid.UUID,
	reader io.Reader,
	fileName string,
) (*ImportResult, error) {
	startTime := time.Now()

	log.Info().
		Str("tenant_id", tenantID.String()).
		Str("account_id", accountID.String()).
		Str("file_name", fileName).
		Msg("starting CSV import")

	// Create ingestion job
	job, err := s.createJob(ctx, tenantID, accountID, "csv", fileName)
	if err != nil {
		return nil, fmt.Errorf("creating job: %w", err)
	}

	result := &ImportResult{
		JobID:  job.ID,
		Errors: make([]string, 0),
	}

	// Step 1: Parse CSV
	parser := parsers.NewBankCSVParser(tenantID, accountID)
	normalized, err := parser.Parse(reader)
	if err != nil {
		s.updateJobStatus(ctx, job.ID, dbmodels.JobStatusFailed, err.Error())
		observability.FilesProcessedTotal.WithLabelValues("csv", "failed").Inc()
		return nil, fmt.Errorf("parsing CSV: %w", err)
	}

	result.TotalRows = len(normalized)
	result.TransactionsParsed = len(normalized)
	result.DocumentType = "bank_statement"

	log.Info().
		Int("rows_parsed", len(normalized)).
		Msg("CSV parsing completed")

	observability.RowsParsedTotal.WithLabelValues("bank_statement").Add(float64(len(normalized)))

	// Step 2: Normalize transactions
	normalizeResult, err := s.normalizer.Normalize(ctx, normalized)
	if err != nil {
		s.updateJobStatus(ctx, job.ID, dbmodels.JobStatusFailed, err.Error())
		return nil, fmt.Errorf("normalizing transactions: %w", err)
	}

	result.Duplicates = normalizeResult.Duplicates
	for _, e := range normalizeResult.Errors {
		result.Errors = append(result.Errors, e.Error())
	}

	if len(normalizeResult.Transactions) == 0 {
		errMsg := "no valid transactions after normalization"
		s.updateJobStatus(ctx, job.ID, dbmodels.JobStatusFailed, errMsg)
		observability.FilesProcessedTotal.WithLabelValues("bank_statement", "failed").Inc()
		return nil, errors.ErrNoTransactions
	}

	// Step 3: Store transactions with retry
	var inserted int
	err = retry.Do(ctx, s.retryConfig, func() error {
		var retryErr error
		inserted, retryErr = s.txns.BulkUpsert(ctx, tenantID, normalizeResult.Transactions)
		return retryErr
	})

	if err != nil {
		s.updateJobStatus(ctx, job.ID, dbmodels.JobStatusFailed, err.Error())
		observability.FilesProcessedTotal.WithLabelValues("bank_statement", "failed").Inc()
		return nil, fmt.Errorf("storing transactions: %w", err)
	}

	result.TransactionsInserted = inserted

	log.Info().
		Int("inserted", inserted).
		Int("duplicates", result.Duplicates).
		Msg("transactions stored")

	observability.TransactionsInsertedTotal.WithLabelValues(tenantID.String()).Add(float64(inserted))

	// Step 4: Update job status
	s.updateJobStatus(ctx, job.ID, dbmodels.JobStatusCompleted, "")

	// Step 5: Publish event
	if inserted > 0 {
		if err := s.publishImportEvent(ctx, tenantID, accountID, inserted, job.ID, "csv", "bank_statement"); err != nil {
			log.Error().Err(err).Msg("failed to publish import event")
			// Don't fail the import if event publishing fails
		}
	}

	// Record metrics
	result.Duration = time.Since(startTime)
	observability.IngestionDuration.WithLabelValues("bank_statement").Observe(result.Duration.Seconds())
	observability.FilesProcessedTotal.WithLabelValues("bank_statement", "success").Inc()

	log.Info().
		Str("job_id", job.ID.String()).
		Int("inserted", inserted).
		Dur("duration", result.Duration).
		Msg("CSV import completed successfully")

	return result, nil
}

// ImportPDF imports transactions from a PDF file.
func (s *IngestionService) ImportPDF(
	ctx context.Context,
	tenantID, accountID uuid.UUID,
	reader io.Reader,
	fileName string,
) (*ImportResult, error) {
	startTime := time.Now()

	log.Info().
		Str("tenant_id", tenantID.String()).
		Str("account_id", accountID.String()).
		Str("file_name", fileName).
		Msg("starting PDF import")

	// Create ingestion job
	job, err := s.createJob(ctx, tenantID, accountID, "pdf", fileName)
	if err != nil {
		return nil, fmt.Errorf("creating job: %w", err)
	}

	result := &ImportResult{
		JobID:        job.ID,
		DocumentType: "pdf",
		Errors:       make([]string, 0),
	}

	// Parse PDF
	parser := parsers.NewPDFParser(tenantID, accountID)
	normalized, err := parser.Parse(reader)
	if err != nil {
		s.updateJobStatus(ctx, job.ID, dbmodels.JobStatusFailed, err.Error())
		observability.FilesProcessedTotal.WithLabelValues("pdf", "failed").Inc()
		return nil, fmt.Errorf("parsing PDF: %w", err)
	}

	result.TotalRows = len(normalized)
	result.TransactionsParsed = len(normalized)

	log.Info().
		Int("transactions_parsed", len(normalized)).
		Msg("PDF parsing completed")

	observability.RowsParsedTotal.WithLabelValues("pdf").Add(float64(len(normalized)))

	// Normalize
	normalizeResult, err := s.normalizer.Normalize(ctx, normalized)
	if err != nil {
		s.updateJobStatus(ctx, job.ID, dbmodels.JobStatusFailed, err.Error())
		return nil, fmt.Errorf("normalizing transactions: %w", err)
	}

	result.Duplicates = normalizeResult.Duplicates

	if len(normalizeResult.Transactions) == 0 {
		errMsg := "no valid transactions after normalization"
		s.updateJobStatus(ctx, job.ID, dbmodels.JobStatusFailed, errMsg)
		observability.FilesProcessedTotal.WithLabelValues("pdf", "failed").Inc()
		return nil, errors.ErrNoTransactions
	}

	// Store with retry
	var inserted int
	err = retry.Do(ctx, s.retryConfig, func() error {
		var retryErr error
		inserted, retryErr = s.txns.BulkUpsert(ctx, tenantID, normalizeResult.Transactions)
		return retryErr
	})

	if err != nil {
		s.updateJobStatus(ctx, job.ID, dbmodels.JobStatusFailed, err.Error())
		observability.FilesProcessedTotal.WithLabelValues("pdf", "failed").Inc()
		return nil, fmt.Errorf("storing transactions: %w", err)
	}

	result.TransactionsInserted = inserted

	log.Info().
		Int("inserted", inserted).
		Msg("PDF transactions stored")

	observability.TransactionsInsertedTotal.WithLabelValues(tenantID.String()).Add(float64(inserted))

	// Update job
	s.updateJobStatus(ctx, job.ID, dbmodels.JobStatusCompleted, "")

	// Publish event
	if inserted > 0 {
		if err := s.publishImportEvent(ctx, tenantID, accountID, inserted, job.ID, "pdf", "pdf"); err != nil {
			log.Error().Err(err).Msg("failed to publish import event")
		}
	}

	// Metrics
	result.Duration = time.Since(startTime)
	observability.IngestionDuration.WithLabelValues("pdf").Observe(result.Duration.Seconds())
	observability.FilesProcessedTotal.WithLabelValues("pdf", "success").Inc()

	log.Info().
		Str("job_id", job.ID.String()).
		Int("inserted", inserted).
		Dur("duration", result.Duration).
		Msg("PDF import completed successfully")

	return result, nil
}

// createJob creates an ingestion job record.
func (s *IngestionService) createJob(
	ctx context.Context,
	tenantID, accountID uuid.UUID,
	source, fileName string,
) (*dbmodels.IngestionJob, error) {
	job, err := s.jobs.Create(ctx, tenantID, dbmodels.CreateIngestionJobInput{
		JobType: source,
		Metadata: map[string]any{
			"account_id": accountID.String(),
			"file_name":  fileName,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("creating job: %w", err)
	}

	log.Debug().
		Str("job_id", job.ID.String()).
		Str("source", source).
		Msg("ingestion job created")

	return job, nil
}

// updateJobStatus updates the job status.
func (s *IngestionService) updateJobStatus(ctx context.Context, jobID uuid.UUID, status dbmodels.JobStatus, errorMsg string) {
	if err := s.jobs.UpdateStatus(ctx, jobID, status, errorMsg); err != nil {
		log.Error().
			Err(err).
			Str("job_id", jobID.String()).
			Str("status", string(status)).
			Msg("failed to update job status")
	}
}

// publishImportEvent publishes a transaction import event to NATS.
func (s *IngestionService) publishImportEvent(
	ctx context.Context,
	tenantID, accountID uuid.UUID,
	count int,
	jobID uuid.UUID,
	source, documentType string,
) error {
	if s.publisher == nil {
		log.Warn().Msg("publisher not available, skipping event")
		return nil
	}

	payload := events.TransactionsImportedPayload{
		TenantID:         tenantID.String(),
		AccountID:        accountID.String(),
		TransactionCount: count,
		JobID:            jobID,
		Source:           source,
		DocumentType:     documentType,
	}

	err := retry.Do(ctx, s.retryConfig, func() error {
		return s.publisher.PublishNew(
			ctx,
			events.SubjectTransactionsImported,
			"transactions.imported",
			tenantID.String(),
			1,
			payload,
		)
	})

	if err != nil {
		observability.EventsPublishedTotal.WithLabelValues(events.SubjectTransactionsImported, "failed").Inc()
		return fmt.Errorf("publishing event: %w", err)
	}

	observability.EventsPublishedTotal.WithLabelValues(events.SubjectTransactionsImported, "success").Inc()

	log.Info().
		Str("tenant_id", tenantID.String()).
		Int("transaction_count", count).
		Str("subject", events.SubjectTransactionsImported).
		Msg("import event published")

	return nil
}
