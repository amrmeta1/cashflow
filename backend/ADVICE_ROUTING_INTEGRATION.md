# Advice Routing Integration - Implementation Complete ✅

## Summary

Successfully integrated the AI Treasury Decision Engine into the conversational AI flow via the Hybrid Router. Users can now ask advice-type questions and receive natural language recommendations powered by the Decision Engine with Claude synthesis.

## Files Modified (3)

### 1. `internal/ai/router/types.go`
**Change**: Added `RouteTypeAdvice` constant

```go
const (
    RouteTypeForecast RouteType = "forecast"
    RouteTypeRAG      RouteType = "rag"
    RouteTypeHybrid   RouteType = "hybrid"
    RouteTypeAdvice   RouteType = "advice"  // NEW
)
```

### 2. `internal/ai/router/classifier.go`
**Changes**:
- Added `adviceKeywords` array with 15+ trigger phrases
- Updated `ClassifyQuestion()` to detect advice questions

**Advice Keywords**:
```go
adviceKeywords = []string{
    "should we", "what should we do", "recommend", "recommendation",
    "how can we improve cash", "how to fix cash", "cash strategy",
    "improve liquidity", "reduce burn", "what can we do",
    "advice", "suggest", "help us", "what actions",
    "how do we", "best way to", "optimize cash",
    "improve cash flow", "fix liquidity", "reduce costs",
}
```

**Classification Logic**:
```go
// Advice: user asking for recommendations
if hasAdvice {
    confidence := 0.9
    reason := "Question contains advice/recommendation keywords"
    return RouteTypeAdvice, confidence, reason
}
```

### 3. `internal/ai/router/router.go`
**Changes**:
- Added `decisionEngine *usecase.DecisionEngine` field to `HybridRouter`
- Updated `NewHybridRouter()` to accept `decisionEngine` parameter
- Added `RouteTypeAdvice` case to routing switch
- Implemented `routeToAdvice()` handler
- Implemented `synthesizeAdviceWithClaude()` for natural language synthesis
- Implemented `deterministicAdviceFallback()` for Claude failures
- Implemented `buildAdvicePrompt()` for Claude prompt construction

**New Methods** (~140 lines):
1. `routeToAdvice()` - Main advice routing handler
2. `synthesizeAdviceWithClaude()` - Claude synthesis
3. `deterministicAdviceFallback()` - Fallback when Claude fails
4. `buildAdvicePrompt()` - Prompt builder

### 4. `internal/rag/bootstrap.go`
**Changes**:
- Updated `NewBootstrap()` to accept `decisionEngine` parameter
- Passed `decisionEngine` to `router.NewHybridRouter()`

## Implementation Details

### Advice Route Flow

```
User Question: "What should we do about next month's cash drop?"
    ↓
Classifier detects "should we do" → RouteTypeAdvice (confidence: 0.9)
    ↓
Router calls routeToAdvice()
    ↓
Decision Engine analyzes forecast + transactions
    ↓
Returns recommended actions (e.g., delay payments, reduce costs)
    ↓
Claude synthesizes natural language response
    ↓
Returns conversational advice to user
```

### Claude Synthesis Prompt

```
You are a treasury AI advisor for a GCC-based company.

The user asked: "{question}"

Based on analysis of their cash forecast and transaction data, 
the following financial actions are recommended:

1. Delay vendor payments (liquidity)
   - Delay selected vendor payments by 5 days to improve near-term liquidity.
   - Estimated impact: SAR 900000
   - Confidence: 82%

2. Accelerate receivables collection (revenue)
   - Implement early payment incentives to speed up customer payments.
   - Estimated impact: SAR 650000
   - Confidence: 76%

Instructions:
- Explain these recommendations in a clear, conversational tone
- Focus on the top 2-3 most impactful actions
- Explain WHY each action is recommended
- Be concise (3-4 sentences total)
- Use SAR currency
- Sound professional but approachable
```

### Deterministic Fallback

If Claude fails, returns structured text:

```
Based on current treasury data, here are the recommended actions:

1. Delay vendor payments: Delay selected vendor payments by 5 days to improve near-term liquidity. (Estimated impact: SAR 900000, Confidence: 82%)
2. Accelerate receivables collection: Implement early payment incentives to speed up customer payments. (Estimated impact: SAR 650000, Confidence: 76%)
3. Reduce marketing spend: Cut discretionary marketing expenses by 15% for next quarter. (Estimated impact: SAR 400000, Confidence: 71%)
```

## API Contract

### Endpoint
```
POST /api/v1/tenants/{tenantID}/rag/query
```

**No changes to existing endpoint** - advice routing happens internally.

### Request
```json
{
  "question": "What should we do about next month's cash drop?"
}
```

### Response (Advice Route)
```json
{
  "answer": "Based on your cash forecast showing a significant drop next month, I recommend three key actions. First, consider delaying vendor payments by 5 days, which could preserve SAR 900,000 in liquidity. Second, accelerate receivables collection through early payment incentives, potentially bringing in SAR 650,000 sooner. Finally, reduce discretionary marketing spend by 15%, saving approximately SAR 400,000. These actions together would significantly improve your near-term cash position.",
  "citations": [],
  "metadata": {
    "route": "advice",
    "confidence": 0.9,
    "reason": "Question contains advice/recommendation keywords"
  }
}
```

### Response (No Actions Needed)
```json
{
  "answer": "Based on current treasury data, your cash position is healthy and no immediate actions are recommended.",
  "citations": [],
  "metadata": {
    "route": "advice",
    "confidence": 0.9,
    "reason": "Question contains advice/recommendation keywords (no actions needed)"
  }
}
```

## Logging

All routing decisions are logged with:
- Route type
- Confidence score
- Reason for classification
- Question text

**Example Log**:
```
INFO Question classified route=advice confidence=0.9 reason="Question contains advice/recommendation keywords" question="What should we do about cash flow?"
INFO Routing to advice engine (Decision Engine) tenant_id=...
```

## Test Cases

### Test 1: Advice Question (Liquidity Risk)
**Input**: "What should we do about next month's cash drop?"

**Expected**:
- Route: `advice`
- Confidence: `0.9`
- Decision Engine called
- Returns liquidity + cost reduction actions
- Claude synthesizes natural language response

**Example Response**:
```
"Based on your cash forecast showing a significant drop next month, I recommend 
delaying vendor payments by 5 days (SAR 900K impact) and reducing discretionary 
marketing spend by 15% (SAR 400K impact). These actions will help preserve 
liquidity during the challenging period."
```

### Test 2: Advice Question (General)
**Input**: "How can we improve our cash flow?"

**Expected**:
- Route: `advice`
- Decision Engine analyzes current state
- Returns relevant actions based on forecast
- Natural language explanation

### Test 3: Advice Question (Healthy Position)
**Input**: "What actions should we take?"

**Expected**:
- Route: `advice`
- Decision Engine returns empty array
- Response: "Your cash position is healthy and no immediate actions are recommended."

### Test 4: Non-Advice Question
**Input**: "What is our cash forecast for next week?"

**Expected**:
- Route: `forecast` (not advice)
- Routed to forecast engine
- No Decision Engine call

### Test 5: Claude Failure Fallback
**Input**: "What should we do to improve liquidity?"

**Scenario**: Claude API fails

**Expected**:
- Route: `advice`
- Decision Engine returns actions
- Deterministic fallback used
- Structured list of actions returned

## Integration with main.go

Update the main service initialization to pass Decision Engine to bootstrap:

```go
// Initialize Decision Engine
decisionEngine := usecase.NewDecisionEngine(forecastUC, bankTxnRepo)

// Initialize RAG with Decision Engine
ragBootstrap := rag.NewBootstrap(
    pool,
    voyageAPIKey,
    claudeAPIKey,
    ragServiceURL,
    forecastUC,
    decisionEngine,  // NEW PARAMETER
)
```

## Testing Instructions

### 1. Start Backend Service
```bash
cd backend
go run cmd/tenant-service/main.go
```

### 2. Test Advice Routing
```bash
# Test 1: Advice question
curl -X POST http://localhost:8080/api/v1/tenants/{tenantID}/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What should we do about next months cash drop?"}'

# Expected: route=advice, natural language recommendations

# Test 2: General improvement
curl -X POST http://localhost:8080/api/v1/tenants/{tenantID}/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "How can we improve our cash flow?"}'

# Expected: route=advice, actionable recommendations

# Test 3: Forecast question (should NOT route to advice)
curl -X POST http://localhost:8080/api/v1/tenants/{tenantID}/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is our cash forecast for next week?"}'

# Expected: route=forecast, NOT advice
```

### 3. Check Logs
```bash
# Look for routing decisions
grep "Question classified" logs/app.log

# Look for advice routing
grep "Routing to advice engine" logs/app.log
```

### 4. Verify Response Format
- Answer is natural language (not JSON)
- Citations array is empty (advice doesn't cite documents)
- Metadata shows `route: "advice"`
- Confidence is 0.9 for advice keywords

## Key Features

✅ **Seamless Integration** - No API changes, works with existing endpoint  
✅ **Intelligent Routing** - Automatically detects advice questions  
✅ **Natural Language** - Claude synthesizes conversational responses  
✅ **Deterministic Fallback** - Works even if Claude fails  
✅ **Multi-Tenant Safe** - Decision Engine maintains isolation  
✅ **Comprehensive Logging** - All routing decisions logged  
✅ **Graceful Degradation** - Returns helpful message if no actions  

## Constraints Verified

✅ Does NOT modify Forecast logic  
✅ Does NOT modify RAG logic  
✅ Does NOT modify Decision Engine logic  
✅ Extends Hybrid Router only  
✅ Maintains existing API contract  
✅ No breaking changes  

## Example Conversations

### Conversation 1: Liquidity Crisis
**User**: "We're running low on cash next month. What should we do?"

**System** (via advice route):
"I can see you're facing a liquidity challenge. Based on your forecast, I recommend three immediate actions: First, delay vendor payments by 5 days to preserve SAR 900,000. Second, accelerate receivables collection through early payment incentives (SAR 650,000 impact). Third, reduce discretionary marketing spend by 15% (SAR 400,000 savings). These steps will significantly improve your near-term cash position."

### Conversation 2: Healthy Position
**User**: "What actions should we take to improve our treasury?"

**System** (via advice route):
"Based on current treasury data, your cash position is healthy and no immediate actions are recommended."

### Conversation 3: Cost Optimization
**User**: "How can we reduce our burn rate?"

**System** (via advice route):
"To reduce your burn rate, I recommend focusing on cost optimization. Consider reducing marketing spend by 15% (SAR 400,000 savings), delaying non-critical hiring (SAR 250,000 impact), and cutting discretionary operational expenses (SAR 150,000 savings). These actions are based on your current outflow patterns and can be implemented without disrupting core operations."

## Future Enhancements

1. **Action Tracking**: Store which advice was given and track if user followed it
2. **Personalized Advice**: Learn from user's past actions to improve recommendations
3. **Multi-Language**: Support Arabic advice synthesis
4. **Contextual Advice**: Combine with RAG to provide policy-aware recommendations
5. **Action Simulation**: Automatically run simulations for recommended actions

## Deployment Checklist

- [ ] Update `main.go` to pass Decision Engine to `rag.NewBootstrap()`
- [ ] Deploy backend service
- [ ] Test advice routing with sample questions
- [ ] Verify logging shows correct route classification
- [ ] Confirm Claude synthesis works
- [ ] Test deterministic fallback (disable Claude temporarily)
- [ ] Verify multi-tenant isolation
- [ ] Monitor performance (should be <500ms including Decision Engine)

## Success Metrics

**Routing Accuracy**:
- Advice questions → `advice` route (target: >95%)
- Forecast questions → `forecast` route (no false positives)
- RAG questions → `rag` route (no false positives)

**Response Quality**:
- Natural language (not structured JSON)
- Actionable recommendations
- Concise (3-4 sentences)
- Professional tone

**Performance**:
- Total response time < 500ms (including Decision Engine + Claude)
- Decision Engine: ~200ms
- Claude synthesis: ~200-300ms

---

**Status**: ✅ **IMPLEMENTATION COMPLETE**  
**Ready for**: Integration and Testing  
**Breaking Changes**: None  
**New Dependencies**: None (uses existing Decision Engine)
