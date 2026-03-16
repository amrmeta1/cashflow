# إصلاح main.go - الكود الصحيح

## المشكلة
`ragBootstrap.DecisionHandler` غير موجود - `DecisionHandler` هو handler منفصل.

## الحل الصحيح

في ملف `cmd/ingestion-service/main.go`، استبدل الكود من السطر 165 إلى 180 بهذا:

```go
// Initialize Decision Engine
decisionEngine := usecase.NewDecisionEngine(forecastUC, bankTxnRepo)
log.Info().Msg("Decision Engine initialized")

// Read API keys for RAG system
voyageAPIKey := os.Getenv("VOYAGE_API_KEY")
if voyageAPIKey == "" {
	log.Warn().Msg("VOYAGE_API_KEY not set - embeddings will be disabled")
}

ragServiceURL := os.Getenv("RAG_SERVICE_URL") // optional external RAG service

// Initialize RAG bootstrap
ragBootstrap := rag.NewBootstrap(
	pool,
	voyageAPIKey,
	claudeAPIKey,
	ragServiceURL,
	forecastUC,
	decisionEngine,
)
log.Info().Msg("RAG system initialized with Decision Engine")

// Init HTTP handlers
ingestionHandler := httpAdapter.NewIngestionHandler(ingestionUC, publisher)
analysisHandler := httpAdapter.NewAnalysisHandler(analysisUC, analysisRepo)
forecastHandler := httpAdapter.NewForecastHandler(forecastUC)
cashStoryHandler := httpAdapter.NewCashStoryHandler(cashStoryUC)
decisionHandler := httpAdapter.NewDecisionHandler(decisionEngine)  // 👈 أضف هذا

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
	Decision:    decisionHandler,                  // 👈 استخدم decisionHandler
	RAGDocument: ragBootstrap.DocumentHandler,     // 👈 من ragBootstrap
	RAGQuery:    ragBootstrap.RagHandler,          // 👈 من ragBootstrap
})
```

## الفرق المهم

❌ **خطأ:**
```go
Decision: ragBootstrap.DecisionHandler,  // غير موجود!
```

✅ **صح:**
```go
decisionHandler := httpAdapter.NewDecisionHandler(decisionEngine)
Decision: decisionHandler,  // ✓
```

## بعد التعديل

1. احفظ الملف
2. أعد بناء السيرفر:
```bash
cd backend
go build -o ingestion-service cmd/ingestion-service/main.go
```

3. شغل السيرفر:
```bash
export AUTH_DEV_MODE=true
export VOYAGE_API_KEY="pa-lF0fXb_bBr2jUeYlz79p2WOrZnG9MhrjYh2Otv7H6yn"
export ANTHROPIC_API_KEY="your-key"
SERVER_PORT=8081 ./ingestion-service
```

4. جرب رفع ملف:
```bash
curl -X POST http://localhost:8081/tenants/demo/documents \
  -F "title=Test Document" \
  -F "type=pdf" \
  -F "file=@README.md"
```

---

**الخلاصة:** `DecisionHandler` يتم إنشاؤه منفصل، مش من `ragBootstrap`.
