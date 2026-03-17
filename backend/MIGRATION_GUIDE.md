# Migration Guide - New Architecture

This guide explains how to migrate from the old monolithic ingestion service to the new modular architecture.

## Overview

The new architecture separates concerns into distinct layers:
- **Ingestion**: File parsing and storage
- **Treasury**: Analytics pipeline
- **Events**: NATS-based communication

## Migration Steps

### Step 1: Update Imports

**Old:**
```go
import "github.com/finch-co/cashflow/internal/operations"
```

**New:**
```go
import (
    "github.com/finch-co/cashflow/internal/ingestion/service"
    "github.com/finch-co/cashflow/internal/treasury/pipeline"
    "github.com/finch-co/cashflow/internal/events"
)
```

### Step 2: Replace Ingestion Service

**Old (operations.UseCase):**
```go
uc := operations.NewUseCase(
    bankAccounts,
    rawTxns,
    txns,
    jobs,
    idempotency,
    publisher,
    vendorLearning,
    vendorIdentity,
    vendorStats,
    cashFlowDNA,
    forecastUC,
    advisorUC,
    classifier,
    analysisService,
)

result, err := uc.ImportBankCSV(ctx, tenantID, accountID, reader)
```

**New (service.IngestionService):**
```go
ingestionSvc := service.NewIngestionService(
    bankAccounts,
    rawTxns,
    txns,
    jobs,
    vendors,
    publisher,
)

result, err := ingestionSvc.ImportCSV(ctx, tenantID, accountID, reader, fileName)
```

### Step 3: Set Up Pipeline Worker

**In tenant-service/main.go:**

```go
import (
    "github.com/finch-co/cashflow/internal/treasury/pipeline"
    "github.com/finch-co/cashflow/internal/events"
)

func main() {
    // ... existing setup ...

    // Create NATS JetStream
    js, err := jetstream.New(nc)
    if err != nil {
        log.Fatal().Err(err).Msg("failed to create jetstream")
    }

    // Create pipeline orchestrator
    orchestrator := pipeline.NewOrchestrator(
        classifier,
        vendorStats,
        cashFlowDNA,
        forecastUC,
        advisorUC,
        analysisService,
    )

    // Create and start pipeline worker
    worker, err := pipeline.NewWorker(js, orchestrator)
    if err != nil {
        log.Fatal().Err(err).Msg("failed to create pipeline worker")
    }

    // Start worker in background
    go func() {
        if err := worker.Start(context.Background()); err != nil {
            log.Error().Err(err).Msg("pipeline worker failed")
        }
    }()

    // ... rest of server setup ...
}
```

### Step 4: Update Event Publishing

The new ingestion service automatically publishes events after successful import.

**Event Published:**
```json
{
  "subject": "cashflow.transactions.imported",
  "payload": {
    "tenant_id": "uuid",
    "account_id": "uuid",
    "transaction_count": 100,
    "job_id": "uuid",
    "source": "csv",
    "document_type": "bank_statement"
  }
}
```

### Step 5: Remove Inline Pipeline

**Old (inline goroutine in ingestion_service.go):**
```go
// Delete this entire block:
go func() {
    bgCtx := context.Background()
    
    // AI Classification
    if uc.classifier != nil {
        uc.classifier.ClassifyTransactions(bgCtx, tenantID)
    }
    
    // Vendor Stats
    if uc.vendorStats != nil {
        uc.vendorStats.UpdateStatsForTransactions(bgCtx, tenantID, normalizedTxns)
    }
    
    // ... more steps ...
}()
```

**New (handled by pipeline worker):**
```go
// Nothing needed - worker consumes event and runs pipeline automatically
```

### Step 6: Update API Handlers

**Old:**
```go
func (h *Handler) ImportCSV(w http.ResponseWriter, r *http.Request) {
    // ... parse request ...
    
    result, err := h.useCase.ImportBankCSV(ctx, tenantID, accountID, file)
    
    // ... handle response ...
}
```

**New:**
```go
func (h *Handler) ImportCSV(w http.ResponseWriter, r *http.Request) {
    // ... parse request ...
    
    result, err := h.ingestionService.ImportCSV(ctx, tenantID, accountID, file, fileName)
    
    // ... handle response ...
}
```

## Backward Compatibility

### Option 1: Feature Flag

Keep both implementations and use a feature flag:

```go
if useNewArchitecture {
    result, err = newIngestionService.ImportCSV(ctx, tenantID, accountID, reader, fileName)
} else {
    result, err = oldUseCase.ImportBankCSV(ctx, tenantID, accountID, reader)
}
```

### Option 2: Gradual Migration

Migrate tenant by tenant:

```go
if isNewArchitectureTenant(tenantID) {
    result, err = newIngestionService.ImportCSV(ctx, tenantID, accountID, reader, fileName)
} else {
    result, err = oldUseCase.ImportBankCSV(ctx, tenantID, accountID, reader)
}
```

## Testing

### Unit Tests

**Test Parsers:**
```go
func TestBankCSVParser(t *testing.T) {
    parser := parsers.NewBankCSVParser(tenantID, accountID)
    
    csvData := `date,description,amount
2024-01-01,Test Transaction,100.00`
    
    reader := strings.NewReader(csvData)
    transactions, err := parser.Parse(reader)
    
    assert.NoError(t, err)
    assert.Len(t, transactions, 1)
    assert.Equal(t, 100.0, transactions[0].Amount)
}
```

**Test Normalizer:**
```go
func TestTransactionNormalizer(t *testing.T) {
    normalizer := normalizer.NewTransactionNormalizer(mockVendorRepo)
    
    normalized := []models.NormalizedTransaction{
        {TenantID: tenantID, AccountID: accountID, Date: time.Now(), Amount: 100, Description: "Test"},
    }
    
    result, err := normalizer.Normalize(context.Background(), normalized)
    
    assert.NoError(t, err)
    assert.Len(t, result.Transactions, 1)
}
```

**Test Pipeline Orchestrator:**
```go
func TestPipelineOrchestrator(t *testing.T) {
    orchestrator := pipeline.NewOrchestrator(
        mockClassifier,
        mockVendorStats,
        mockCashFlowDNA,
        mockForecast,
        mockAdvisor,
        mockAnalysis,
    )
    
    result, err := orchestrator.Execute(context.Background(), tenantID)
    
    assert.NoError(t, err)
    assert.Equal(t, 6, result.StepsCompleted)
}
```

### Integration Tests

**End-to-End Test:**
```go
func TestEndToEndIngestion(t *testing.T) {
    // 1. Upload CSV
    result, err := ingestionService.ImportCSV(ctx, tenantID, accountID, csvReader, "test.csv")
    assert.NoError(t, err)
    
    // 2. Verify event published
    // (check NATS stream)
    
    // 3. Wait for pipeline completion
    time.Sleep(5 * time.Second)
    
    // 4. Verify analysis created
    analysis, err := analysisRepo.GetLatest(ctx, tenantID)
    assert.NoError(t, err)
    assert.NotNil(t, analysis)
}
```

## Monitoring

### Metrics to Watch

**Ingestion:**
- `cashflow_ingestion_files_total{document_type="bank_statement",status="success"}`
- `cashflow_ingestion_duration_seconds{document_type="bank_statement"}`
- `cashflow_ingestion_rows_parsed_total{document_type="bank_statement"}`

**Pipeline:**
- `cashflow_pipeline_executions_total{status="success"}`
- `cashflow_pipeline_step_duration_seconds{step="ai_classification"}`
- `cashflow_pipeline_failures_total{step="forecast_generation"}`

**Events:**
- `cashflow_events_published_total{subject="cashflow.transactions.imported",status="success"}`
- `cashflow_events_consumed_total{subject="cashflow.transactions.imported",status="success"}`

### Logging

All operations log structured data:

```json
{
  "level": "info",
  "tenant_id": "uuid",
  "document_type": "bank_statement",
  "rows_parsed": 100,
  "transactions_inserted": 95,
  "duplicates": 5,
  "duration_ms": 1234,
  "message": "CSV import completed successfully"
}
```

## Rollback Plan

If issues arise:

1. **Stop pipeline worker**
2. **Revert to old ingestion service**
3. **Clear NATS stream** (if needed)
4. **Restart services**

```bash
# Stop tenant service
pkill -f tenant-service

# Clear NATS stream (if needed)
nats stream purge CASHFLOW --force

# Restart with old code
git checkout main
go run cmd/tenant-service/main.go
```

## Performance Comparison

### Old Architecture
- Ingestion + Pipeline: **20-40 seconds** (blocking)
- User waits for complete pipeline
- Single-threaded processing

### New Architecture
- Ingestion: **1-3 seconds** (returns immediately)
- Pipeline: **15-30 seconds** (async, non-blocking)
- User gets instant feedback
- Scalable workers

## Common Issues

### Issue 1: Events Not Being Consumed

**Symptom:** Transactions imported but no analysis generated

**Solution:**
```bash
# Check NATS stream
nats stream info CASHFLOW

# Check consumer
nats consumer info CASHFLOW treasury-pipeline-worker

# Restart worker
```

### Issue 2: Duplicate Processing

**Symptom:** Pipeline runs multiple times for same import

**Solution:**
- Check NATS deduplication (Nats-Msg-Id header)
- Verify idempotency keys are unique
- Check consumer ack policy

### Issue 3: Parser Errors

**Symptom:** "unable to detect document type"

**Solution:**
- Check CSV headers match expected format
- Verify column names (case-insensitive)
- Check for BOM or encoding issues

## Next Steps

1. ✅ Review this migration guide
2. ✅ Update ingestion-service/main.go
3. ✅ Update tenant-service/main.go to start worker
4. ✅ Test with sample CSV files
5. ✅ Monitor metrics and logs
6. ✅ Gradually roll out to production tenants

## Support

For issues or questions:
- Check logs: `tail -f logs/ingestion-service.log`
- Check metrics: `http://localhost:8080/metrics`
- Review architecture: `ARCHITECTURE_WORKFLOW.md`
