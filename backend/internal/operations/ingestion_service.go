package operations

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

	"github.com/finch-co/cashflow/internal/ai"
	"github.com/finch-co/cashflow/internal/ingestion/bank_parser"
	"github.com/finch-co/cashflow/internal/liquidity"
	"github.com/finch-co/cashflow/internal/models"
)

// UseCase handles financial data operations workflows (CSV import, bank sync, cash position).
// This package is a bounded context for the operations service; it can be extracted
// into a separate service later with minimal change.
type UseCase struct {
	bankAccounts    models.BankAccountRepository
	rawTxns         models.RawBankTransactionRepository
	txns            models.BankTransactionRepository
	jobs            models.IngestionJobRepository
	idempotency     models.IdempotencyRepository
	publisher       interface{}
	vendorLearning  *VendorLearningService
	vendorIdentity  *VendorIdentityService
	vendorStats     *VendorStatsService
	cashFlowDNA     *CashFlowDNAService
	forecastUC      *liquidity.ForecastUseCase
	advisorUC       *liquidity.AdvisorUseCase
	classifier      *ai.TransactionClassifier
	analysisService *AnalysisService
}

// NewUseCase creates a new operations use case.
func NewUseCase(
	bankAccounts models.BankAccountRepository,
	rawTxns models.RawBankTransactionRepository,
	txns models.BankTransactionRepository,
	jobs models.IngestionJobRepository,
	idempotency models.IdempotencyRepository,
	publisher interface{},
	vendorLearning *VendorLearningService,
	vendorIdentity *VendorIdentityService,
	vendorStats *VendorStatsService,
	cashFlowDNA *CashFlowDNAService,
	forecastUC *liquidity.ForecastUseCase,
	advisorUC *liquidity.AdvisorUseCase,
	classifier *ai.TransactionClassifier,
	analysisService *AnalysisService,
) *UseCase {
	return &UseCase{
		bankAccounts:    bankAccounts,
		rawTxns:         rawTxns,
		txns:            txns,
		jobs:            jobs,
		idempotency:     idempotency,
		publisher:       publisher,
		vendorLearning:  vendorLearning,
		vendorIdentity:  vendorIdentity,
		vendorStats:     vendorStats,
		cashFlowDNA:     cashFlowDNA,
		forecastUC:      forecastUC,
		advisorUC:       advisorUC,
		classifier:      classifier,
		analysisService: analysisService,
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

// ensureDefaultBankAccount creates a default bank account if none exists for the tenant
func (uc *UseCase) ensureDefaultBankAccount(ctx context.Context, tenantID uuid.UUID, currency string) (uuid.UUID, error) {
	// Check if tenant has any accounts
	accounts, _, err := uc.bankAccounts.ListByTenant(ctx, tenantID, 1, 0)
	if err != nil {
		return uuid.Nil, fmt.Errorf("checking existing accounts: %w", err)
	}

	// If accounts exist, return the first one
	if len(accounts) > 0 {
		return accounts[0].ID, nil
	}

	// No accounts exist - create default account
	if currency == "" {
		currency = "QAR" // Default to Qatari Riyal
	}

	account, err := uc.bankAccounts.Create(ctx, tenantID, models.CreateBankAccountInput{
		Provider:   "imported",
		ExternalID: fmt.Sprintf("auto-%s", uuid.New().String()[:8]),
		Currency:   currency,
		Nickname:   "Primary Account",
		Metadata: map[string]any{
			"auto_created": true,
			"source":       "csv_import",
		},
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("creating default account: %w", err)
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Str("account_id", account.ID.String()).
		Str("currency", currency).
		Msg("auto-created default bank account")

	return account.ID, nil
}

// ImportBankCSV processes a CSV file upload containing bank transactions.
// Expected CSV columns: date, amount, currency, description, counterparty, category
func (uc *UseCase) ImportBankCSV(ctx context.Context, tenantID, accountID uuid.UUID, reader io.Reader) (*CSVImportResult, error) {
	// If accountID is nil, auto-create or use existing default account
	if accountID == uuid.Nil {
		var err error
		accountID, err = uc.ensureDefaultBankAccount(ctx, tenantID, "") // Currency will be detected from CSV
		if err != nil {
			return nil, fmt.Errorf("ensuring default account: %w", err)
		}
	}

	_, err := uc.bankAccounts.GetByID(ctx, tenantID, accountID)
	if err != nil {
		return nil, fmt.Errorf("bank account not found: %w", err)
	}

	job, err := uc.jobs.Create(ctx, tenantID, models.CreateIngestionJobInput{
		JobType: "csv_import",
		Metadata: map[string]any{
			"account_id": accountID.String(),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("creating operations job: %w", err)
	}

	_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusRunning, "")

	result := &CSVImportResult{JobID: job.ID}

	csvReader := csv.NewReader(reader)
	csvReader.TrimLeadingSpace = true

	header, err := csvReader.Read()
	if err != nil {
		_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusFailed, "failed to read CSV header")
		return nil, fmt.Errorf("reading CSV header: %w", err)
	}

	log.Info().
		Strs("headers", header).
		Msg("csv headers read")

	colMap := buildColumnMap(header)

	// Use Document Detection Engine to identify file type
	detector := NewDocumentDetector()
	docType, err := detector.DetectCSVType(header, colMap)
	if err != nil {
		_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusFailed, err.Error())
		return nil, fmt.Errorf("%w: %s", models.ErrValidation, err.Error())
	}

	log.Info().
		Str("document_type", string(docType)).
		Str("document_name", detector.GetDocumentTypeString(docType)).
		Strs("columns", header).
		Msg("document type detected")

	// Validate required columns for detected document type
	if err := detector.ValidateColumns(docType, colMap, header); err != nil {
		_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusFailed, err.Error())
		return nil, fmt.Errorf("%w: %s", models.ErrValidation, err.Error())
	}

	var rawPayloads []map[string]any
	var normalizedTxns []models.BankTransaction
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

		log.Debug().
			Int("row", lineNum).
			Strs("row_values", record).
			Msg("processing csv row")

		rawPayload := make(map[string]any)
		for i, val := range record {
			if i < len(header) {
				rawPayload[header[i]] = val
			}
		}
		rawPayloads = append(rawPayloads, rawPayload)

		// Parse based on detected document type
		var txn *models.BankTransaction
		switch docType {
		case DocumentTypeLedger:
			txn, err = parseLedgerRow(record, colMap, tenantID, accountID, lineNum)
		case DocumentTypeBankStatement:
			txn, err = parseCSVRow(record, colMap, tenantID, accountID, lineNum)
		default:
			err = fmt.Errorf("unsupported document type: %s", docType)
		}

		if err != nil {
			result.Errors++
			log.Warn().
				Int("row", lineNum).
				Err(err).
				Msg("failed to parse row")
			result.ErrorDetail = append(result.ErrorDetail, fmt.Sprintf("line %d: %s", lineNum, err.Error()))
			continue
		}
		log.Debug().
			Int("row", lineNum).
			Float64("amount", txn.Amount).
			Str("description", txn.Description).
			Msg("row parsed successfully")
		normalizedTxns = append(normalizedTxns, *txn)
	}

	log.Info().
		Int("total_rows", result.TotalRows).
		Int("parsed_transactions", len(normalizedTxns)).
		Int("errors", result.Errors).
		Msg("CSV parsing completed")

	if len(normalizedTxns) == 0 {
		log.Error().
			Int("total_rows", result.TotalRows).
			Int("errors", result.Errors).
			Strs("error_details", result.ErrorDetail).
			Msg("no transactions parsed from file")
		errMsg := fmt.Sprintf("no valid transactions found (total rows: %d, errors: %d)", result.TotalRows, result.Errors)
		log.Error().Msg(errMsg)
		_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusFailed, errMsg)
		return nil, fmt.Errorf("%s", errMsg)
	}

	log.Info().
		Int("transactions_ready", len(normalizedTxns)).
		Str("tenant_id", tenantID.String()).
		Str("account_id", accountID.String()).
		Msg("transactions ready for insertion")

	rawIDs, err := uc.rawTxns.BulkCreate(ctx, tenantID, "csv", rawPayloads)
	if err != nil {
		log.Error().Err(err).Msg("failed to store raw transactions")
	} else {
		log.Debug().
			Int("raw_ids_created", len(rawIDs)).
			Msg("raw transactions stored")
		for i := range normalizedTxns {
			if i < len(rawIDs) {
				id := rawIDs[i]
				normalizedTxns[i].RawID = &id
			}
		}
	}

	inserted, err := uc.txns.BulkUpsert(ctx, tenantID, normalizedTxns)
	if err != nil {
		log.Error().Err(err).Msg("BulkUpsert failed")
		_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusFailed, err.Error())
		return nil, fmt.Errorf("upserting transactions: %w", err)
	}

	result.Inserted = inserted
	result.Duplicates = len(normalizedTxns) - inserted - result.Errors

	log.Info().
		Int("expected", len(normalizedTxns)).
		Int("inserted", inserted).
		Int("duplicates", result.Duplicates).
		Str("tenant_id", tenantID.String()).
		Str("account_id", accountID.String()).
		Msg("database insertion completed")

	_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusCompleted, "")

	// Trigger async treasury pipeline after successful import
	if inserted > 0 {
		go func() {
			bgCtx := context.Background()

			log.Info().
				Str("tenant_id", tenantID.String()).
				Int("imported", inserted).
				Msg("treasury pipeline started")

			// 0. AI Classification - classify transactions (runs first)
			if uc.classifier != nil {
				log.Info().Msg("AI classification started")
				if err := uc.classifier.ClassifyTransactions(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("AI classification failed")
				}
				// Note: classifier logs "transactions classified" internally
			}

			// 1. Vendor Stats - update spending analytics
			if uc.vendorStats != nil {
				if err := uc.vendorStats.UpdateStatsForTransactions(bgCtx, tenantID, normalizedTxns); err != nil {
					log.Error().Err(err).Msg("vendor stats update failed")
				} else {
					log.Info().Str("tenant_id", tenantID.String()).Msg("vendor stats updated")
				}
			}

			// 2. Cash Flow DNA - detect recurring patterns
			if uc.cashFlowDNA != nil {
				if err := uc.cashFlowDNA.AnalyzePatterns(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("cashflow DNA analysis failed")
				} else {
					log.Info().Str("tenant_id", tenantID.String()).Msg("cashflow patterns detected")
				}
			}

			// 3. Forecast Engine - recalculate 13-week forecast
			if uc.forecastUC != nil {
				if _, err := uc.forecastUC.GenerateForecast(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("forecast recalculation failed")
				} else {
					log.Info().Str("tenant_id", tenantID.String()).Msg("forecast recalculated")
				}
			}

			// 4. Advisor Engine - analyze liquidity
			if uc.advisorUC != nil {
				if err := uc.advisorUC.AnalyzeLiquidity(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("liquidity analysis failed")
				}
			}

			// 5. Analysis Service - generate cash analysis
			if uc.analysisService != nil {
				if err := uc.analysisService.GenerateAnalysis(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("cash analysis generation failed")
				}
			}

			log.Info().Str("tenant_id", tenantID.String()).Msg("treasury pipeline completed")
		}()
	}

	return result, nil
}

// ImportBankJSON processes a JSON payload containing structured bank transactions.
// Supports deduplication via SHA256 hash: {tenant_id}|{account_id}|{date}|{amount}|{description}
func (uc *UseCase) ImportBankJSON(ctx context.Context, tenantID uuid.UUID, payload models.ImportBankJSONPayload) (*models.JSONImportResult, error) {
	// If accountID is nil, auto-create or use existing default account
	accountID := payload.AccountID
	if accountID == uuid.Nil {
		var err error
		accountID, err = uc.ensureDefaultBankAccount(ctx, tenantID, "")
		if err != nil {
			return nil, fmt.Errorf("ensuring default account: %w", err)
		}
		// Update payload with the account ID
		payload.AccountID = accountID
	}

	_, err := uc.bankAccounts.GetByID(ctx, tenantID, payload.AccountID)
	if err != nil {
		return nil, fmt.Errorf("bank account not found: %w", err)
	}

	job, err := uc.jobs.Create(ctx, tenantID, models.CreateIngestionJobInput{
		JobType: "json_import",
		Metadata: map[string]any{
			"account_id": payload.AccountID.String(),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("creating ingestion job: %w", err)
	}

	_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusRunning, "")

	result := &models.JSONImportResult{
		JobID:     job.ID,
		TotalRows: len(payload.Transactions),
	}

	var normalizedTxns []models.BankTransaction
	var rawPayloads []map[string]any

	for _, txn := range payload.Transactions {
		// Parse date
		txnDate, err := time.Parse("2006-01-02", txn.Date)
		if err != nil {
			result.Errors++
			log.Warn().Err(err).Str("date", txn.Date).Msg("failed to parse transaction date")
			continue
		}

		// Try to apply vendor learning rules if service is available
		if uc.vendorLearning != nil && txn.RawText != "" {
			match, err := uc.vendorLearning.ApplyRules(ctx, tenantID, txn.RawText)
			if err != nil {
				log.Warn().Err(err).Msg("failed to apply vendor rules")
			} else if match != nil {
				// Rule matched - use learned vendor and category
				txn.AIVendor = match.VendorName
				txn.Category = match.Category
				txn.AIConfidence = int(match.Confidence * 100)

				// If description is empty or same as raw text, use vendor name
				if txn.Description == "" || txn.Description == txn.RawText {
					txn.Description = match.VendorName
				}
			}
		}

		// Resolve vendor identity first (before hash generation)
		var vendorID *uuid.UUID
		if uc.vendorIdentity != nil {
			resolvedVendorID, err := uc.vendorIdentity.ResolveVendor(
				ctx,
				tenantID,
				txn.AIVendor,
				txn.RawText,
				txn.Category,
			)
			if err != nil {
				log.Warn().Err(err).Msg("failed to resolve vendor identity")
			} else {
				vendorID = &resolvedVendorID
			}
		}

		// Generate SHA256 hash for deduplication
		// Format: {tenant_id}|{account_id}|{date}|{amount}|{normalized_description}|{vendor_id}
		// Normalize description to avoid false duplicates
		normalizedDesc := normalizeDescription(txn.Description)
		vendorIDStr := ""
		if vendorID != nil {
			vendorIDStr = vendorID.String()
		}
		hashInput := fmt.Sprintf("%s|%s|%s|%.2f|%s|%s",
			tenantID.String(),
			payload.AccountID.String(),
			txn.Date,
			txn.Amount,
			normalizedDesc,
			vendorIDStr,
		)
		hashBytes := sha256.Sum256([]byte(hashInput))
		hash := fmt.Sprintf("%x", hashBytes)

		// Create normalized transaction
		normalizedTxn := models.BankTransaction{
			TenantID:     tenantID,
			AccountID:    payload.AccountID,
			TxnDate:      txnDate,
			Amount:       txn.Amount,
			Currency:     txn.Currency,
			Description:  txn.Description,
			Counterparty: txn.Counterparty,
			Category:     txn.Category,
			Hash:         hash,
			VendorID:     vendorID,
		}
		normalizedTxns = append(normalizedTxns, normalizedTxn)

		// Store raw payload for audit trail
		rawPayload := map[string]any{
			"date":          txn.Date,
			"amount":        txn.Amount,
			"currency":      txn.Currency,
			"description":   txn.Description,
			"counterparty":  txn.Counterparty,
			"category":      txn.Category,
			"raw_text":      txn.RawText,
			"ai_vendor":     txn.AIVendor,
			"ai_confidence": txn.AIConfidence,
		}
		rawPayloads = append(rawPayloads, rawPayload)
	}

	if len(normalizedTxns) == 0 {
		_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusCompleted, "")
		return result, nil
	}

	// Store raw transactions
	rawIDs, err := uc.rawTxns.BulkCreate(ctx, tenantID, "json_import", rawPayloads)
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

	// Bulk upsert with deduplication (ON CONFLICT DO NOTHING)
	inserted, err := uc.txns.BulkUpsert(ctx, tenantID, normalizedTxns)
	if err != nil {
		_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusFailed, err.Error())
		return nil, fmt.Errorf("upserting transactions: %w", err)
	}

	result.Imported = inserted
	result.Duplicates = len(normalizedTxns) - inserted - result.Errors

	_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusCompleted, "")

	// Trigger async engines after successful import
	// These run in background goroutines so the API response remains fast
	if inserted > 0 {
		go func() {
			// Create background context (don't use request context)
			bgCtx := context.Background()

			log.Info().
				Str("tenant_id", tenantID.String()).
				Int("imported", inserted).
				Msg("treasury pipeline started")

			// 0. AI Classification - classify transactions (runs first)
			if uc.classifier != nil {
				log.Info().Msg("AI classification started")
				if err := uc.classifier.ClassifyTransactions(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("AI classification failed")
				}
				// Note: classifier logs "transactions classified" internally
			}

			// 1. Vendor Stats - update spending analytics
			if uc.vendorStats != nil {
				if err := uc.vendorStats.UpdateStatsForTransactions(bgCtx, tenantID, normalizedTxns); err != nil {
					log.Error().Err(err).Msg("vendor stats update failed")
				} else {
					log.Info().Str("tenant_id", tenantID.String()).Msg("vendor stats updated")
				}
			}

			// 2. Cash Flow DNA - detect recurring patterns
			if uc.cashFlowDNA != nil {
				if err := uc.cashFlowDNA.AnalyzePatterns(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("cashflow DNA analysis failed")
				} else {
					log.Info().Str("tenant_id", tenantID.String()).Msg("cashflow patterns detected")
				}
			}

			// 3. Forecast Engine - recalculate 13-week forecast
			if uc.forecastUC != nil {
				if _, err := uc.forecastUC.GenerateForecast(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("forecast recalculation failed")
				} else {
					log.Info().Str("tenant_id", tenantID.String()).Msg("forecast recalculated")
				}
			}

			// 4. Advisor Engine - analyze liquidity
			if uc.advisorUC != nil {
				if err := uc.advisorUC.AnalyzeLiquidity(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("liquidity analysis failed")
				}
				// Note: advisorUC logs "liquidity analysis completed" internally
			}

			// 5. Analysis Service - generate cash analysis
			if uc.analysisService != nil {
				if err := uc.analysisService.GenerateAnalysis(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("cash analysis generation failed")
				}
			}

			log.Info().Str("tenant_id", tenantID.String()).Msg("treasury pipeline completed")
		}()
	}

	return result, nil
}

// ImportBankPDF imports transactions from a PDF bank statement
func (uc *UseCase) ImportBankPDF(ctx context.Context, tenantID, accountID uuid.UUID, pdfBytes []byte) (*CSVImportResult, error) {
	log.Info().
		Str("tenant_id", tenantID.String()).
		Str("account_id", accountID.String()).
		Int("pdf_size", len(pdfBytes)).
		Msg("pdf statement uploaded")

	if len(pdfBytes) == 0 {
		return nil, fmt.Errorf("empty PDF file")
	}

	// If accountID is nil, auto-create or use existing default account
	if accountID == uuid.Nil {
		var err error
		accountID, err = uc.ensureDefaultBankAccount(ctx, tenantID, "")
		if err != nil {
			return nil, fmt.Errorf("ensuring default account: %w", err)
		}
	}

	// Verify account exists
	account, err := uc.bankAccounts.GetByID(ctx, tenantID, accountID)
	if err != nil {
		return nil, fmt.Errorf("bank account not found: %w", err)
	}

	// Initialize parser registry
	registry := bank_parser.NewParserRegistry()

	// Parse PDF and detect bank type
	parsedTxns, bankType, err := registry.DetectAndParse(pdfBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse PDF: %w", err)
	}

	log.Info().
		Str("bank_type", bankType).
		Int("transaction_count", len(parsedTxns)).
		Msg("pdf statement parsed successfully")

	// Validate that we have transactions
	if len(parsedTxns) == 0 {
		errMsg := "no transactions found in PDF - file may not match expected format"
		log.Error().Str("bank_type", bankType).Msg(errMsg)
		return nil, fmt.Errorf("%s", errMsg)
	}

	// Create ingestion job
	job, err := uc.jobs.Create(ctx, tenantID, models.CreateIngestionJobInput{
		JobType: "pdf_import",
		Metadata: map[string]any{
			"account_id": accountID.String(),
			"bank_type":  bankType,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("creating ingestion job: %w", err)
	}

	_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusRunning, "")

	result := &CSVImportResult{
		JobID:     job.ID,
		TotalRows: len(parsedTxns),
	}

	// Convert parsed transactions to BankTransaction model
	var normalizedTxns []models.BankTransaction
	var rawPayloads []map[string]any

	for _, ptxn := range parsedTxns {
		// Extract vendor from description
		vendorName := bank_parser.ExtractVendorFromDescription(ptxn.Description)
		category := bank_parser.CategorizeTransaction(ptxn.Description)

		// Try to apply vendor learning rules if service is available
		if uc.vendorLearning != nil && ptxn.Description != "" {
			match, err := uc.vendorLearning.ApplyRules(ctx, tenantID, ptxn.Description)
			if err != nil {
				log.Warn().Err(err).Msg("failed to apply vendor rules")
			} else if match != nil {
				// Rule matched - use learned vendor and category
				vendorName = match.VendorName
				category = match.Category
			}
		}

		// Resolve vendor identity
		var vendorID *uuid.UUID
		if uc.vendorIdentity != nil {
			resolvedVendorID, err := uc.vendorIdentity.ResolveVendor(
				ctx,
				tenantID,
				vendorName,
				ptxn.Description,
				category,
			)
			if err != nil {
				log.Warn().Err(err).Msg("failed to resolve vendor identity")
			} else {
				vendorID = &resolvedVendorID
			}
		}

		// Generate deduplication hash
		vendorIDStr := ""
		if vendorID != nil {
			vendorIDStr = vendorID.String()
		}
		hashInput := fmt.Sprintf("%s|%s|%s|%.2f|%s|%s",
			tenantID.String(),
			accountID.String(),
			ptxn.Date.Format("2006-01-02"),
			ptxn.Amount,
			normalizeDescription(ptxn.Description),
			vendorIDStr,
		)
		hash := fmt.Sprintf("%x", sha256.Sum256([]byte(hashInput)))

		// Create normalized transaction
		txn := models.BankTransaction{
			TenantID:     tenantID,
			AccountID:    accountID,
			TxnDate:      ptxn.Date,
			Amount:       ptxn.Amount,
			Currency:     account.Currency,
			Description:  ptxn.Description,
			Counterparty: vendorName,
			Category:     category,
			Hash:         hash,
			VendorID:     vendorID,
			AIVendorName: &vendorName,
			AICategory:   &category,
			AIConfidence: 0.85,
			AIClassified: true,
		}

		normalizedTxns = append(normalizedTxns, txn)

		// Store raw payload
		rawPayload := map[string]any{
			"date":        ptxn.Date.Format("2006-01-02"),
			"description": ptxn.Description,
			"amount":      ptxn.Amount,
			"balance":     ptxn.Balance,
			"debit":       ptxn.Debit,
			"credit":      ptxn.Credit,
			"bank_type":   bankType,
		}
		rawPayloads = append(rawPayloads, rawPayload)
	}

	log.Info().
		Int("parsed_transactions", len(parsedTxns)).
		Int("normalized_transactions", len(normalizedTxns)).
		Msg("PDF transactions normalized")

	// Store raw transactions
	if len(rawPayloads) > 0 {
		_, err := uc.rawTxns.BulkCreate(ctx, tenantID, "pdf_import", rawPayloads)
		if err != nil {
			log.Warn().Err(err).Msg("failed to store raw transactions")
		}
	}

	// Bulk upsert normalized transactions
	inserted, err := uc.txns.BulkUpsert(ctx, tenantID, normalizedTxns)
	if err != nil {
		log.Error().Err(err).Msg("PDF BulkUpsert failed")
		_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusFailed, err.Error())
		return nil, fmt.Errorf("bulk upsert failed: %w", err)
	}

	result.Inserted = inserted
	result.Duplicates = len(normalizedTxns) - inserted

	log.Info().
		Int("expected", len(normalizedTxns)).
		Int("inserted", inserted).
		Int("duplicates", result.Duplicates).
		Msg("PDF import completed - transactions inserted")

	_ = uc.jobs.UpdateStatus(ctx, job.ID, models.JobStatusCompleted, "")

	log.Info().
		Str("tenant_id", tenantID.String()).
		Str("job_id", job.ID.String()).
		Int("inserted", inserted).
		Int("duplicates", result.Duplicates).
		Msg("pdf import completed")

	// Trigger treasury pipeline in background (same as CSV import)
	if inserted > 0 {
		go func() {
			bgCtx := context.Background()

			// 1. AI Classification
			if uc.classifier != nil {
				if err := uc.classifier.ClassifyTransactions(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("AI classification failed")
				} else {
					log.Info().Str("tenant_id", tenantID.String()).Msg("AI classification completed")
				}
			}

			// 2. Cash Flow DNA - detect recurring patterns
			if uc.cashFlowDNA != nil {
				if err := uc.cashFlowDNA.AnalyzePatterns(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("cashflow DNA analysis failed")
				} else {
					log.Info().Str("tenant_id", tenantID.String()).Msg("cashflow patterns detected")
				}
			}

			// 3. Forecast Engine - recalculate 13-week forecast
			if uc.forecastUC != nil {
				if _, err := uc.forecastUC.GenerateForecast(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("forecast recalculation failed")
				} else {
					log.Info().Str("tenant_id", tenantID.String()).Msg("forecast recalculated")
				}
			}

			// 4. Vendor Stats - update vendor statistics
			if uc.vendorStats != nil {
				if err := uc.vendorStats.UpdateStatsForTransactions(bgCtx, tenantID, normalizedTxns); err != nil {
					log.Error().Err(err).Msg("vendor stats update failed")
				}
			}

			// 5. Analysis Service - generate cash analysis
			if uc.analysisService != nil {
				if err := uc.analysisService.GenerateAnalysis(bgCtx, tenantID); err != nil {
					log.Error().Err(err).Msg("cash analysis generation failed")
				}
			}

			log.Info().Str("tenant_id", tenantID.String()).Msg("treasury pipeline completed")
		}()
	}

	return result, nil
}

// ListTransactions retrieves bank transactions for a tenant with filters.
func (uc *UseCase) ListTransactions(ctx context.Context, filter models.TransactionFilter) ([]models.BankTransaction, int, error) {
	return uc.txns.List(ctx, filter)
}

// CreateBankAccount registers a new bank account for a tenant.
func (uc *UseCase) CreateBankAccount(ctx context.Context, tenantID uuid.UUID, input models.CreateBankAccountInput) (*models.BankAccount, error) {
	if input.Currency == "" {
		input.Currency = "SAR"
	}
	if input.Provider == "" {
		input.Provider = "manual"
	}
	return uc.bankAccounts.Create(ctx, tenantID, input)
}

// EnqueueSyncBank publishes a sync_bank command to RabbitMQ.
func (uc *UseCase) EnqueueSyncBank(ctx context.Context, tenantID uuid.UUID) (*models.IngestionJob, error) {
	job, err := uc.jobs.Create(ctx, tenantID, models.CreateIngestionJobInput{
		JobType: "sync_bank",
	})
	if err != nil {
		return nil, fmt.Errorf("creating sync_bank job: %w", err)
	}

	// TODO: Publish command when publisher is implemented
	// env, err := operations.NewEnvelope(operations.RKIngestionSyncBank, tenantID.String(), map[string]any{"job_id": job.ID.String()})
	// uc.publisher.PublishCommand(ctx, operations.RKIngestionSyncBank, env)

	return job, nil
}

// EnqueueSyncAccounting publishes a sync_accounting command to RabbitMQ.
func (uc *UseCase) EnqueueSyncAccounting(ctx context.Context, tenantID uuid.UUID) (*models.IngestionJob, error) {
	job, err := uc.jobs.Create(ctx, tenantID, models.CreateIngestionJobInput{
		JobType: "sync_accounting",
	})
	if err != nil {
		return nil, fmt.Errorf("creating sync_accounting job: %w", err)
	}

	// TODO: Publish command when publisher is implemented
	// env, err := operations.NewEnvelope(operations.RKIngestionSyncAccounting, tenantID.String(), map[string]any{"job_id": job.ID.String()})
	// uc.publisher.PublishCommand(ctx, operations.RKIngestionSyncAccounting, env)

	return job, nil
}

func (uc *UseCase) GetCashPosition(ctx context.Context, tenantID uuid.UUID, asOf time.Time) (*models.CashPositionResponse, error) {
	accounts, _, err := uc.bankAccounts.ListByTenant(ctx, tenantID, 500, 0)
	if err != nil {
		return nil, fmt.Errorf("listing bank accounts: %w", err)
	}

	balances, err := uc.txns.SumBalancesByAccountUpTo(ctx, tenantID, asOf)
	if err != nil {
		return nil, fmt.Errorf("summing balances: %w", err)
	}

	asOfDate := asOf.Truncate(24 * time.Hour)
	resp := &models.CashPositionResponse{
		TenantID:     tenantID.String(),
		AsOf:         asOfDate.Format("2006-01-02"),
		CurrencyMode: "native",
		Accounts:     make([]models.CashPositionAccount, 0, len(accounts)),
		Totals:       models.CashPositionTotals{ByCurrency: []models.CashPositionTotalByCurrency{}},
	}

	totalsByCurrency := make(map[string]float64)
	for _, acc := range accounts {
		bal := balances[acc.ID]
		resp.Accounts = append(resp.Accounts, models.CashPositionAccount{
			AccountID: acc.ID,
			Name:      acc.Nickname,
			Currency:  acc.Currency,
			Balance:   bal,
		})
		totalsByCurrency[acc.Currency] += bal
	}
	for currency, balance := range totalsByCurrency {
		resp.Totals.ByCurrency = append(resp.Totals.ByCurrency, models.CashPositionTotalByCurrency{
			Currency: currency,
			Balance:  balance,
		})
	}

	return resp, nil
}

// ListBankAccounts retrieves all bank accounts for a tenant
func (uc *UseCase) ListBankAccounts(ctx context.Context, tenantID uuid.UUID) ([]models.BankAccount, error) {
	accounts, _, err := uc.bankAccounts.ListByTenant(ctx, tenantID, 500, 0)
	if err != nil {
		return nil, fmt.Errorf("listing bank accounts: %w", err)
	}
	return accounts, nil
}

func buildColumnMap(header []string) map[string]int {
	m := make(map[string]int, len(header))
	for i, col := range header {
		colLower := strings.TrimSpace(strings.ToLower(col))
		m[colLower] = i

		// Add aliases for common column name variations
		switch colLower {
		case "account name", "account_name", "accountname":
			m["account_name"] = i
		case "debit", "withdrawal", "dr", "withdrawals":
			m["debit"] = i
		case "credit", "deposit", "cr", "deposits":
			m["credit"] = i
		case "running balance", "running_balance", "balance":
			m["balance"] = i
		case "transaction date", "transaction_date", "txn date", "txn_date":
			m["date"] = i
		case "details", "particulars", "narration":
			m["description"] = i
		}
	}
	return m
}

func parseCSVRow(record []string, colMap map[string]int, tenantID, accountID uuid.UUID, rowNum int) (*models.BankTransaction, error) {
	getCol := func(name string) string {
		if idx, ok := colMap[name]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	dateStr := getCol("date")
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
		return nil, fmt.Errorf("row %d: invalid date %q", rowNum, dateStr)
	}

	// Support both amount column and debit/credit columns
	var amount float64
	amountStr := getCol("amount")
	if amountStr != "" && amountStr != "-" && amountStr != "0" {
		// Format 1: Single amount column
		amount, err = strconv.ParseFloat(strings.ReplaceAll(amountStr, ",", ""), 64)
		if err != nil {
			return nil, fmt.Errorf("row %d: invalid amount %q", rowNum, amountStr)
		}
	} else {
		// Format 2: Debit/Credit columns
		debitStr := getCol("debit")
		creditStr := getCol("credit")

		var debit, credit float64
		if debitStr != "" && debitStr != "-" && debitStr != "0" {
			debit, err = strconv.ParseFloat(strings.ReplaceAll(debitStr, ",", ""), 64)
			if err != nil {
				log.Warn().Str("debit", debitStr).Int("row", rowNum).Msg("failed to parse debit")
				debit = 0
			}
		}
		if creditStr != "" && creditStr != "-" && creditStr != "0" {
			credit, err = strconv.ParseFloat(strings.ReplaceAll(creditStr, ",", ""), 64)
			if err != nil {
				log.Warn().Str("credit", creditStr).Int("row", rowNum).Msg("failed to parse credit")
				credit = 0
			}
		}

		if debit == 0 && credit == 0 {
			return nil, fmt.Errorf("row %d: no amount, debit, or credit value found", rowNum)
		}

		// Credit is positive, debit is negative
		amount = credit - debit
	}

	if currency == "" {
		currency = "SAR"
	}
	if category == "" {
		category = "uncategorized"
	}

	hash := computeTransactionHash(accountID.String(), dateStr, fmt.Sprintf("%.2f", amount), description, counterparty)

	// Mark as AI classified if we have category and counterparty
	aiClassified := category != "" && category != "uncategorized"
	aiConfidence := 0.0
	if aiClassified {
		aiConfidence = 0.85
	}

	log.Debug().
		Int("row", rowNum).
		Str("date", dateStr).
		Float64("amount", amount).
		Str("description", description).
		Msg("bank statement row parsed")

	return &models.BankTransaction{
		TenantID:     tenantID,
		AccountID:    accountID,
		TxnDate:      txnDate,
		Amount:       amount,
		Currency:     currency,
		Description:  description,
		Counterparty: counterparty,
		Category:     category,
		Hash:         hash,
		AIClassified: aiClassified,
		AIConfidence: aiConfidence,
		AIVendorName: &counterparty,
		AICategory:   &category,
	}, nil
}

func computeTransactionHash(accountID, date, amount, description, counterparty string) string {
	raw := strings.Join([]string{accountID, date, amount, description, counterparty}, "|")
	h := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("%x", h)
}

// normalizeDescription normalizes a description string to avoid false duplicates
// Normalization: trim whitespace, lowercase, collapse multiple spaces
func normalizeDescription(desc string) string {
	// Trim whitespace
	desc = strings.TrimSpace(desc)
	// Convert to lowercase
	desc = strings.ToLower(desc)
	// Collapse multiple spaces into single space
	desc = strings.Join(strings.Fields(desc), " ")
	return desc
}
