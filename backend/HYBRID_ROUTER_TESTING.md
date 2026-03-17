# Hybrid AI Router - Testing Guide

## Quick Start

### 1. Update main.go Integration

Since main.go files are in .gitignore, you need to manually update them:

**Location**: `cmd/tenant-service/main.go` (or wherever RAG is initialized)

**Find this code**:
```go
ragBootstrap := rag.NewBootstrap(pool, voyageAPIKey, claudeAPIKey, ragServiceURL)
```

**Replace with**:
```go
// Initialize forecast use case (if not already initialized)
forecastUC := usecase.NewForecastUseCase(bankTxnRepo, bankAccountRepo)

// Pass to RAG bootstrap for hybrid router
ragBootstrap := rag.NewBootstrap(pool, voyageAPIKey, claudeAPIKey, ragServiceURL, forecastUC)
```

### 2. Start the Service

```bash
cd backend
go run cmd/tenant-service/main.go
```

### 3. Test the Endpoints

## Test Cases

### Test 1: Forecast Route

**Question**: "What is the cash forecast for next month?"

**Expected**: Routes to forecast engine

```bash
curl -X POST "http://localhost:8080/api/v1/tenants/00000000-0000-0000-0000-000000000001/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the cash forecast for next month?"
  }'
```

**Expected Response**:
```json
{
  "answer": "Based on the 13-week cash forecast: Current cash position is SAR X. In 4 weeks, cash is projected to be SAR Y...",
  "citations": []
}
```

**Log Output**:
```
INFO Question classified route=forecast confidence=0.9 reason="Question contains forecast-related keywords"
INFO Routing to forecast engine tenant_id=...
```

### Test 2: RAG Route

**Question**: "What is our payment policy?"

**Expected**: Routes to RAG engine

```bash
curl -X POST "http://localhost:8080/api/v1/tenants/00000000-0000-0000-0000-000000000001/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is our payment policy?"
  }'
```

**Expected Response**:
```json
{
  "answer": "According to the company payment policy document...",
  "citations": [
    {
      "document_id": "uuid",
      "chunk_id": "uuid",
      "content": "..."
    }
  ]
}
```

**Log Output**:
```
INFO Question classified route=rag confidence=0.9 reason="Question contains document/policy-related keywords"
INFO Routing to RAG engine tenant_id=...
```

### Test 3: Hybrid Route (with Claude)

**Question**: "Why will cash drop next month?"

**Expected**: Routes to hybrid engine, combines forecast + RAG with Claude

```bash
curl -X POST "http://localhost:8080/api/v1/tenants/00000000-0000-0000-0000-000000000001/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Why will cash drop next month?"
  }'
```

**Expected Response**:
```json
{
  "answer": "Cash is projected to drop by SAR X next month primarily due to... [Claude-generated synthesis combining forecast data and document context]",
  "citations": [...]
}
```

**Log Output**:
```
INFO Question classified route=hybrid confidence=0.85 reason="Question contains forecast indicators with reasoning/context keywords"
INFO Routing to hybrid engine tenant_id=...
```

### Test 4: Hybrid Route (Claude Fails - Fallback)

**Setup**: Temporarily unset `ANTHROPIC_API_KEY` or simulate Claude failure

**Question**: "Why will cash drop next month?"

**Expected**: Deterministic fallback (no request failure)

```bash
# Unset Claude API key
unset ANTHROPIC_API_KEY

# Restart service
go run cmd/tenant-service/main.go

# Test
curl -X POST "http://localhost:8080/api/v1/tenants/00000000-0000-0000-0000-000000000001/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Why will cash drop next month?"
  }'
```

**Expected Response**:
```json
{
  "answer": "Financial Forecast: Current cash: SAR X. 4-week projection: SAR Y... Context: [RAG answer if available]",
  "citations": [...]
}
```

**Log Output**:
```
INFO Question classified route=hybrid confidence=0.85
INFO Routing to hybrid engine tenant_id=...
WARN Claude synthesis failed, using deterministic fallback
```

### Test 5: Classification Edge Cases

#### General Question (Default to RAG)
```bash
curl -X POST "http://localhost:8080/api/v1/tenants/{tenantID}/rag/query" \
  -H "Content-Type: application/json" \
  -d '{"question": "Tell me about the company"}'
```

**Expected**: Routes to RAG (default)

**Log**:
```
INFO Question classified route=rag confidence=0.6 reason="Default route for general questions"
```

#### Mixed Keywords (Hybrid)
```bash
curl -X POST "http://localhost:8080/api/v1/tenants/{tenantID}/rag/query" \
  -H "Content-Type: application/json" \
  -d '{"question": "Explain the forecast based on our contracts"}'
```

**Expected**: Routes to hybrid

**Log**:
```
INFO Question classified route=hybrid confidence=0.85
```

## Verification Checklist

### Routing Logic
- [ ] Forecast keywords trigger forecast route
- [ ] RAG keywords trigger RAG route
- [ ] Forecast + reasoning keywords trigger hybrid route
- [ ] General questions default to RAG
- [ ] Confidence scores are reasonable (0.6-0.9)

### Forecast Route
- [ ] Returns forecast data formatted as natural language
- [ ] No citations returned
- [ ] Handles empty forecast gracefully

### RAG Route
- [ ] External RAG client tried first (if configured)
- [ ] Falls back to embedded RAG if external fails
- [ ] Returns citations when available
- [ ] Handles no documents gracefully

### Hybrid Route
- [ ] Fetches forecast summary
- [ ] Fetches RAG answer
- [ ] Sends both to Claude for synthesis
- [ ] Returns combined answer with citations
- [ ] Falls back to deterministic combination if Claude fails
- [ ] Does NOT fail the request if Claude fails

### API Contract
- [ ] Endpoint path unchanged: `/api/v1/tenants/{tenantID}/rag/query`
- [ ] Request format unchanged: `{"question": "..."}`
- [ ] Response format unchanged: `{"answer": "...", "citations": [...]}`
- [ ] Metadata NOT exposed in public API

### Multi-Tenant Isolation
- [ ] Each tenant sees only their own forecast data
- [ ] Each tenant sees only their own documents
- [ ] Routing decisions logged with tenant_id

### Error Handling
- [ ] Invalid tenant ID returns 400
- [ ] Missing question returns 400
- [ ] Forecast failure returns appropriate error
- [ ] RAG failure falls back gracefully
- [ ] Claude failure uses deterministic fallback

## Performance Testing

### Response Times
```bash
# Measure response time for each route type
time curl -X POST "http://localhost:8080/api/v1/tenants/{tenantID}/rag/query" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the cash forecast?"}'
```

**Expected**:
- Forecast route: < 500ms
- RAG route: < 2s (depending on document count)
- Hybrid route: < 3s (includes Claude API call)

### Concurrent Requests
```bash
# Test with multiple concurrent requests
for i in {1..10}; do
  curl -X POST "http://localhost:8080/api/v1/tenants/{tenantID}/rag/query" \
    -H "Content-Type: application/json" \
    -d '{"question": "Why will cash drop?"}' &
done
wait
```

## Debugging

### Enable Debug Logging
```bash
export LOG_LEVEL=debug
go run cmd/tenant-service/main.go
```

### Check Router Initialization
Look for these log messages on startup:
```
INFO Hybrid AI router initialized
INFO RAG query use case initialized with embedded implementation
INFO Claude AI client initialized
```

### Trace a Request
Follow the logs for a single request:
```
INFO Question classified route=hybrid confidence=0.85 reason="..."
INFO Routing to hybrid engine tenant_id=...
INFO Hybrid route: fetching forecast
INFO Hybrid route: fetching RAG context
INFO Hybrid route: combining with Claude
INFO Hybrid response generated
```

## Common Issues

### Issue: "Hybrid AI router not initialized"
**Cause**: ForecastUseCase not passed to NewBootstrap
**Fix**: Update main.go to pass forecastUC parameter

### Issue: "Claude synthesis failed"
**Cause**: ANTHROPIC_API_KEY not set or invalid
**Fix**: Set valid API key or verify fallback works

### Issue: "Forecast use case not available"
**Cause**: ForecastUseCase is nil
**Fix**: Ensure forecast use case is initialized before RAG bootstrap

### Issue: Classification always returns RAG
**Cause**: Keywords not matching
**Fix**: Check classifier.go keyword lists, add more keywords if needed

## Next Steps

1. **Add ML-based classification**: Replace rule-based classifier with ML model
2. **Add caching**: Cache hybrid responses for repeated questions
3. **Add metrics**: Track route distribution, response times, fallback rates
4. **Add A/B testing**: Compare hybrid vs non-hybrid responses
5. **Add user feedback**: Allow users to rate responses for classification improvement

## Manual Testing Checklist

- [ ] Test forecast route with various forecast questions
- [ ] Test RAG route with various document questions
- [ ] Test hybrid route with "why" questions
- [ ] Test hybrid route with "explain" questions
- [ ] Test fallback when Claude unavailable
- [ ] Test with multiple tenants
- [ ] Test with empty forecast data
- [ ] Test with no documents
- [ ] Verify logs show correct routing decisions
- [ ] Verify API contract unchanged
- [ ] Verify metadata not exposed in response
- [ ] Test concurrent requests
- [ ] Test error scenarios
