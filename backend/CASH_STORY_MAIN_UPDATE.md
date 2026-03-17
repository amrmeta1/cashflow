# تحديثات مطلوبة في main.go

## المشكلة
الـ endpoint يرجع 404 لأن الـ `CashStoryHandler` غير مُمرر للـ router في `cmd/ingestion-service/main.go`

## التعديلات المطلوبة في `cmd/ingestion-service/main.go`

### 1. إضافة import للـ Claude client
```go
import (
    // ... existing imports ...
    "github.com/finch-co/cashflow/internal/rag/adapter/llm"
)
```

### 2. إنشاء Cash Story Use Case (بعد forecastUC)
```go
forecastUC := usecase.NewForecastUseCase(bankTxnRepo, bankAccountRepo)

// Initialize Claude client for cash story
var claudeClient llm.LLMClient
claudeAPIKey := os.Getenv("ANTHROPIC_API_KEY")
if claudeAPIKey != "" {
    claudeClient = llm.NewClaudeClient(claudeAPIKey)
    log.Info().Msg("Claude client initialized for cash story")
} else {
    log.Warn().Msg("ANTHROPIC_API_KEY not set, cash story will use fallback")
}

// Initialize Cash Story Use Case
cashStoryUC := usecase.NewCashStoryUseCase(bankTxnRepo, forecastUC, claudeClient)
```

### 3. إنشاء Cash Story Handler (بعد forecastHandler)
```go
forecastHandler := httpAdapter.NewForecastHandler(forecastUC)
cashStoryHandler := httpAdapter.NewCashStoryHandler(cashStoryUC)
```

### 4. إضافة CashStory للـ router deps
```go
router := httpAdapter.NewIngestionRouter(httpAdapter.IngestionRouterDeps{
    Validator:   jwtValidator,
    Users:       userRepo,
    Memberships: membershipRepo,
    AuditRepo:   auditRepo,
    Ingestion:   ingestionHandler,
    Analysis:    analysisHandler,
    Forecast:    forecastHandler,
    CashStory:   cashStoryHandler,  // إضافة هذا السطر
})
```

## الكود الكامل للقسم المعدّل

```go
// Init use cases
ingestionUC := ingestion.NewUseCase(
    ingestion.Deps{
        BankAccounts:    bankAccountRepo,
        BankTxns:        bankTxnRepo,
        RawBankTxns:     rawBankTxnRepo,
        Jobs:            jobRepo,
        Idempotency:     idempotencyRepo,
    },
)
analysisUC := analysis.NewUseCase(analysisRepo)
forecastUC := usecase.NewForecastUseCase(bankTxnRepo, bankAccountRepo)

// Initialize Claude client for cash story
var claudeClient llm.LLMClient
claudeAPIKey := os.Getenv("ANTHROPIC_API_KEY")
if claudeAPIKey != "" {
    claudeClient = llm.NewClaudeClient(claudeAPIKey)
    log.Info().Msg("Claude client initialized for cash story")
} else {
    log.Warn().Msg("ANTHROPIC_API_KEY not set, cash story will use fallback")
}

// Initialize Cash Story Use Case
cashStoryUC := usecase.NewCashStoryUseCase(bankTxnRepo, forecastUC, claudeClient)

// Init HTTP handlers
ingestionHandler := httpAdapter.NewIngestionHandler(ingestionUC, publisher)
analysisHandler := httpAdapter.NewAnalysisHandler(analysisUC, analysisRepo)
forecastHandler := httpAdapter.NewForecastHandler(forecastUC)
cashStoryHandler := httpAdapter.NewCashStoryHandler(cashStoryUC)

// Build router
router := httpAdapter.NewIngestionRouter(httpAdapter.IngestionRouterDeps{
    Validator:   jwtValidator,
    Users:       userRepo,
    Memberships: membershipRepo,
    AuditRepo:   auditRepo,
    Ingestion:   ingestionHandler,
    Analysis:    analysisHandler,
    Forecast:    forecastHandler,
    CashStory:   cashStoryHandler,
})
```

## بعد التعديل

1. أعد تشغيل الخدمة:
```bash
DB_PORT=5433 DB_USER=cashflow DB_PASSWORD=cashflow DB_NAME=cashflow \
ANTHROPIC_API_KEY=your_key_here \
go run cmd/ingestion-service/main.go
```

2. اختبر الـ endpoint:
```bash
curl -X GET "http://localhost:8080/api/v1/tenants/00000000-0000-0000-0000-000000000001/cash-story" \
  -H "Content-Type: application/json"
```

## ملاحظات
- إذا لم يكن عندك `ANTHROPIC_API_KEY`, الـ endpoint سيشتغل لكن سيرجع رسالة fallback
- تأكد من وجود transactions في الـ database للـ tenant المستخدم
