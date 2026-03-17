# Central API Router - Usage Guide

## Overview

The central API router organizes all backend endpoints under `/api/v1/` with clear module-based routing:

- `/api/v1/tenants/{tenantID}/liquidity/*` - Liquidity management
- `/api/v1/tenants/{tenantID}/operations/*` - Data ingestion & operations
- `/api/v1/tenants/{tenantID}/reporting/*` - Financial reporting & analysis
- `/api/v1/tenants/{tenantID}/ai/*` - AI features (RAG, chat)
- `/api/v1/enterprise/*` - Enterprise features (tenants, users, audit)

## Architecture

### Module Routers

Each module has its own router file:

1. **`internal/liquidity/router.go`** - Liquidity routes
2. **`internal/operations/router.go`** - Operations routes
3. **`internal/reporting/router.go`** - Reporting routes
4. **`internal/ai/router.go`** - AI routes
5. **`internal/enterprise/router.go`** - Enterprise routes

### Central Router

**`internal/api/central_router.go`** - Mounts all module routers under `/api/v1/`

## Usage Example

```go
package main

import (
    "github.com/finch-co/cashflow/internal/ai"
    "github.com/finch-co/cashflow/internal/api"
    "github.com/finch-co/cashflow/internal/enterprise"
    "github.com/finch-co/cashflow/internal/liquidity"
    "github.com/finch-co/cashflow/internal/operations"
    "github.com/finch-co/cashflow/internal/reporting"
)

func main() {
    // Initialize handlers
    forecastHandler := liquidity.NewForecastHandler(forecastUseCase)
    cashStoryHandler := reporting.NewCashStoryHandler(cashStoryUseCase)
    decisionHandler := ai.NewDecisionHandler(decisionEngine)
    ingestionHandler := operations.NewIngestionHandler(ingestionUseCase, publisher)
    analysisHandler := reporting.NewAnalysisHandler(analysisUseCase)
    
    // Build module routers
    liquidityRouter := liquidity.NewRouter(liquidity.RouterDeps{
        Forecast:  forecastHandler,
        CashStory: cashStoryHandler,
        Decision:  decisionHandler,
    })
    
    operationsRouter := operations.NewRouter(operations.RouterDeps{
        Ingestion: ingestionHandler,
    })
    
    reportingRouter := reporting.NewRouter(reporting.RouterDeps{
        Analysis:  analysisHandler,
        Ingestion: ingestionHandler, // For cash-position endpoint
    })
    
    aiRouter := ai.NewRouter(ai.RouterDeps{
        RAGDocument: ragDocumentHandler,
        RAGQuery:    ragQueryHandler,
    })
    
    enterpriseRouter := enterprise.NewRouter(enterprise.RouterDeps{
        Tenants: tenantHandler,
        Members: memberHandler,
        Audit:   auditHandler,
    })
    
    // Create central router
    router := api.NewCentralRouter(api.CentralRouterDeps{
        Validator:        jwtValidator,
        Users:            userRepo,
        Memberships:      membershipRepo,
        AuditRepo:        auditRepo,
        LiquidityRouter:  liquidityRouter,
        OperationsRouter: operationsRouter,
        ReportingRouter:  reportingRouter,
        AIRouter:         aiRouter,
        EnterpriseRouter: enterpriseRouter,
    })
    
    // Start server
    http.ListenAndServe(":8080", router)
}
```

## API Routes

### Liquidity Module (`/api/v1/tenants/{tenantID}/liquidity`)

- `GET /forecast` - Get 13-week cash forecast
- `GET /cash-story` - Get AI-generated cash narrative
- `GET /decisions` - Get AI recommended treasury actions

### Operations Module (`/api/v1/tenants/{tenantID}/operations`)

- `POST /imports/bank-csv` - Import bank CSV file
- `GET /transactions` - List transactions
- `POST /bank-accounts` - Create bank account
- `POST /sync/bank` - Sync bank data
- `POST /sync/accounting` - Sync accounting data

### Reporting Module (`/api/v1/tenants/{tenantID}/reporting`)

- `GET /analysis/latest` - Get latest financial analysis
- `POST /analysis/run` - Run new analysis
- `GET /cash-position` - Get current cash position

### AI Module (`/api/v1/tenants/{tenantID}/ai`)

- `POST /query` - RAG query endpoint
- `POST /documents` - Upload document
- `GET /documents` - List documents
- `DELETE /documents/{id}` - Delete document

### Enterprise Module (`/api/v1/enterprise`)

- `POST /tenants` - Create tenant
- `GET /tenants` - List tenants
- `GET /tenants/{tenantID}` - Get tenant details
- `POST /tenants/{tenantID}/members` - Add member
- `GET /tenants/{tenantID}/members` - List members
- `GET /users/me` - Get current user profile
- `GET /audit-logs` - List audit logs

## Middleware

All routes under `/api/v1/` have:

1. **Request ID** - Unique ID for each request
2. **Real IP** - Client IP extraction
3. **Request Logging** - Structured logging
4. **Recovery** - Panic recovery
5. **CORS** - Cross-origin support
6. **Demo Mode** - Optional authentication bypass
7. **Tenant Context** - Tenant ID from header/route
8. **Rate Limiting** - Per-tenant rate limits

## Migration from Old Router

### Before (ingestion_router.go)
```go
r.Get("/tenants/{tenantID}/forecast/current", forecastHandler.GetCurrentForecast)
r.Get("/tenants/{tenantID}/cash-story", cashStoryHandler.GetCashStory)
```

### After (central_router.go)
```go
// Routes are now:
// GET /api/v1/tenants/{tenantID}/liquidity/forecast
// GET /api/v1/tenants/{tenantID}/liquidity/cash-story
```

## Benefits

1. **Clear Module Boundaries** - Each module owns its routes
2. **Consistent API Versioning** - All routes under `/api/v1/`
3. **Scalable Structure** - Easy to add new modules
4. **Better Organization** - Routes grouped by business domain
5. **No Breaking Changes** - Handlers remain unchanged

## Notes

- The old `internal/api/router.go` still exists for backward compatibility
- The old `internal/operations/ingestion_router.go` can be deprecated
- All handlers remain in their original locations
- Only routing structure has changed
