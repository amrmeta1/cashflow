# Hybrid AI Router Implementation - Complete

## Summary

Successfully implemented an intelligent routing system that classifies user questions and routes them to Forecast Engine, RAG Service, or a Hybrid approach combining both with Claude synthesis.

## Files Created (3)

### 1. `internal/ai/router/types.go`
**Purpose**: Domain types for the router

**Key Types**:
```go
type RouteType string // "forecast", "rag", "hybrid"

type RouterInput struct {
    TenantID uuid.UUID
    UserID   uuid.UUID
    Question string
}

type RouterOutput struct {
    Answer    string
    Citations []domain.Citation
    Metadata  RouteMetadata  // Internal routing decision info
}

type RouteMetadata struct {
    Route      RouteType
    Confidence float64
    Reason     string
}
```

### 2. `internal/ai/router/classifier.go`
**Purpose**: Rule-based question classification

**Classification Rules**:
- **Forecast keywords**: forecast, cash next, runway, liquidity next, projection, next week/month
- **RAG keywords**: policy, document, contract, agreement, terms, regulation
- **Hybrid indicators**: Forecast keywords + reasoning words (why, explain, cause)

**Function**:
```go
func ClassifyQuestion(question string) (RouteType, float64, string)
```

**Examples**:
- "What is the cash forecast for next month?" → forecast (0.9 confidence)
- "What is our payment policy?" → rag (0.9 confidence)
- "Why will cash drop next month?" → hybrid (0.85 confidence)

### 3. `internal/ai/router/router.go`
**Purpose**: Main router orchestration

**Key Components**:
- `HybridRouter` struct with dependencies (ForecastUC, RAG client, RAG use case, LLM client)
- `Route()` method - main entry point
- `routeToForecast()` - handles forecast-only queries
- `routeToRAG()` - handles RAG-only queries with fallback
- `routeToHybrid()` - handles hybrid queries with Claude synthesis
- `synthesizeWithClaude()` - combines forecast + RAG with Claude
- `deterministicHybridFallback()` - fallback when Claude fails

**Hybrid Route Logic** (Simplified per user request):
1. Get short forecast summary
2. Get short RAG answer
3. Send both to Claude for synthesis
4. If Claude fails → deterministic combination fallback

## Files Modified (2)

### 1. `internal/rag/adapter/http/rag_handler.go`
**Changes**:
- Added `hybridRouter *router.HybridRouter` field to `RagHandler`
- Updated `NewRagHandler()` to accept hybrid router parameter
- Modified `Query()` handler to route through hybrid router if available
- Maintains backward compatibility with fallback to existing RAG use case

**Integration Point**:
```go
func (h *RagHandler) Query(w http.ResponseWriter, r *http.Request) {
    // ... validation ...
    
    // Route through hybrid router if available
    if h.hybridRouter != nil {
        result, err := h.hybridRouter.Route(r.Context(), router.RouterInput{
            TenantID: tenantID,
            Question: req.Question,
        })
        // ... handle result ...
        return
    }
    
    // Fallback to existing RAG use case
    // ... existing code ...
}
```

### 2. `internal/rag/bootstrap.go`
**Changes**:
- Added import for `internal/ai/router` and `internal/usecase`
- Updated `NewBootstrap()` signature to accept `forecastUseCase *forecastUC.ForecastUseCase`
- Initialize hybrid router if forecast use case is provided
- Pass hybrid router to `NewRagHandler()`

**Bootstrap Integration**:
```go
func NewBootstrap(pool *pgxpool.Pool, voyageAPIKey, claudeAPIKey, ragServiceURL string, forecastUseCase *forecastUC.ForecastUseCase) *Bootstrap {
    // ... existing initialization ...
    
    // Initialize hybrid router
    var hybridRouter *router.HybridRouter
    if forecastUseCase != nil {
        hybridRouter = router.NewHybridRouter(
            forecastUseCase,
            ragClient,
            ragQueryUseCase,
            llmClient,
        )
        log.Info().Msg("Hybrid AI router initialized")
    }
    
    // Pass to handler
    ragHandler := http.NewRagHandler(queryRepo, ragQueryUseCase, hybridRouter)
    
    // ...
}
```

### 3. `internal/rag/service.go`
**Changes**:
- Updated `NewRagHandler()` call to pass `nil` as third parameter (no hybrid router in service context)

## Integration Instructions

### For main.go files (cmd/*/main.go)

Update the call to `rag.NewBootstrap()` to pass the forecast use case:

**Before**:
```go
ragBootstrap := rag.NewBootstrap(pool, voyageAPIKey, claudeAPIKey, ragServiceURL)
```

**After**:
```go
// Initialize forecast use case first
forecastUC := usecase.NewForecastUseCase(bankTxnRepo, bankAccountRepo)

// Pass to RAG bootstrap
ragBootstrap := rag.NewBootstrap(pool, voyageAPIKey, claudeAPIKey, ragServiceURL, forecastUC)
```

**Note**: The main.go files are in .gitignore, so they need to be updated manually.

## API Contract Preservation

### Endpoint (Unchanged)
```
POST /api/v1/tenants/{tenantID}/rag/query
```

### Request (Unchanged)
```json
{
  "question": "Why will cash drop next month?"
}
```

### Response (Unchanged)
```json
{
  "answer": "Cash is projected to drop by SAR 1.8M next month...",
  "citations": [
    {
      "document_id": "uuid",
      "chunk_id": "uuid",
      "content": "vendor payment schedule..."
    }
  ]
}
```

**Note**: The `metadata` field (route, confidence, reason) is internal and not exposed in the public API response.

## Routing Examples

### Example 1: Forecast Route
**Question**: "What is the cash forecast for next month?"

**Classification**: forecast (confidence: 0.9)

**Response**:
```json
{
  "answer": "Based on the 13-week cash forecast: Current cash position is SAR 5,000,000.00. In 4 weeks, cash is projected to be SAR 4,200,000.00. By week 13, cash is expected to reach SAR 3,800,000.00. Forecast confidence: 68%.",
  "citations": []
}
```

### Example 2: RAG Route
**Question**: "What is our payment policy?"

**Classification**: rag (confidence: 0.9)

**Response**:
```json
{
  "answer": "According to the company payment policy document, all vendor payments are due within 30 days of invoice receipt...",
  "citations": [
    {
      "document_id": "abc-123",
      "chunk_id": "chunk-456",
      "content": "Payment Policy: All vendor invoices..."
    }
  ]
}
```

### Example 3: Hybrid Route
**Question**: "Why will cash drop next month?"

**Classification**: hybrid (confidence: 0.85)

**Forecast Summary**:
"Current cash: SAR 5,000,000.00. 4-week projection: SAR 4,200,000.00 (-16.00% decrease). Average daily inflow: SAR 50,000.00, outflow: SAR 80,000.00."

**RAG Context**:
"According to the vendor payment schedule, SAR 1,500,000 in payments are due in the next 30 days for contracted services."

**Claude Synthesis**:
```json
{
  "answer": "Cash is projected to drop by SAR 800K next month primarily due to scheduled vendor payments totaling SAR 1.5M as per existing contracts. The forecast shows current cash at SAR 5M declining to SAR 4.2M in 4 weeks. This decrease is driven by contractual payment obligations outlined in your vendor agreements, combined with normal operational expenses where daily outflows (SAR 80K) exceed inflows (SAR 50K).",
  "citations": [
    {
      "document_id": "vendor-schedule",
      "chunk_id": "chunk-789",
      "content": "Vendor Payment Schedule..."
    }
  ]
}
```

**If Claude Fails** (Deterministic Fallback):
```json
{
  "answer": "Financial Forecast: Current cash: SAR 5,000,000.00. 4-week projection: SAR 4,200,000.00 (-16.00% decrease). Average daily inflow: SAR 50,000.00, outflow: SAR 80,000.00. Context: According to the vendor payment schedule, SAR 1,500,000 in payments are due in the next 30 days for contracted services.",
  "citations": [...]
}
```

## Logging

All routing decisions are logged with structured data:

```
INFO Question classified route=hybrid confidence=0.85 reason="Question contains forecast indicators with reasoning/context keywords" question="Why will cash drop next month?"
INFO Routing to hybrid engine tenant_id=abc-123
INFO Hybrid AI router initialized
```

## Error Handling & Fallbacks

### Forecast Route
- If forecast fails → return error

### RAG Route
- External RAG client fails → fallback to embedded RAG
- Embedded RAG fails → return friendly error message

### Hybrid Route
- Forecast fails → use RAG only
- RAG fails → use forecast only
- Claude fails → **deterministic combination fallback** (no request failure)
- All fail → friendly error message

## Testing

### Unit Tests Needed
1. Classifier tests with various question types
2. Router tests for each route type
3. Fallback behavior tests

### Integration Tests
```bash
# Test forecast route
curl -X POST http://localhost:8080/api/v1/tenants/{tenantID}/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the cash forecast for next month?"}'

# Test RAG route
curl -X POST http://localhost:8080/api/v1/tenants/{tenantID}/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is our payment policy?"}'

# Test hybrid route
curl -X POST http://localhost:8080/api/v1/tenants/{tenantID}/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Why will cash drop next month?"}'
```

## Key Features Implemented

✅ **Rule-based classification** with confidence scores and reasoning  
✅ **Three routing strategies**: forecast, RAG, hybrid  
✅ **Simplified hybrid approach**: Get forecast summary + RAG answer → Claude synthesis  
✅ **Internal metadata**: route, confidence, reason (not exposed in API)  
✅ **Graceful fallbacks**: Deterministic combination when Claude fails  
✅ **API contract preserved**: Existing endpoint unchanged  
✅ **Multi-tenant isolation**: Maintained throughout  
✅ **Comprehensive logging**: All routing decisions logged  
✅ **No modifications to existing engines**: Forecast and RAG logic untouched  

## Architecture Diagram

```
User Question
    ↓
POST /api/v1/tenants/{tenantID}/rag/query
    ↓
RagHandler.Query()
    ↓
HybridRouter.Route()
    ↓
Classifier.ClassifyQuestion()
    ↓
┌─────────────┬──────────────┬─────────────────┐
│  Forecast   │     RAG      │     Hybrid      │
│   Route     │    Route     │     Route       │
└─────────────┴──────────────┴─────────────────┘
      ↓              ↓                ↓
ForecastUC      RagClient      1. ForecastUC
                RagUseCase     2. RagClient/RagUseCase
                               3. Claude Synthesis
                               4. Fallback if needed
      ↓              ↓                ↓
RouterOutput with metadata
      ↓
Convert to RagQueryOutput (remove metadata)
      ↓
JSON Response
```

## Implementation Complete

All components have been implemented according to the approved plan with the three requested adjustments:

1. ✅ **Simplified hybrid route**: Get forecast summary + RAG answer → Claude synthesis (no custom low-level RAG pipeline)
2. ✅ **Internal metadata**: Added route, confidence, reason fields
3. ✅ **Claude failure handling**: Deterministic fallback instead of request failure

The implementation is ready for integration into main.go files and testing.
