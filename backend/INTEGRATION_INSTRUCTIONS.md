# RAG Module Integration Instructions

This document provides step-by-step instructions to integrate the RAG document ingestion module into the tenant service.

## Overview

The RAG module has been fully implemented with:
- Document upload endpoint (POST `/tenants/{tenantID}/documents`)
- Document listing, retrieval, and deletion endpoints
- Asynchronous document chunking (500-800 tokens, 50-80 overlap)
- PDF, DOCX, and TXT parsing support
- Local file storage for uploaded documents
- PostgreSQL storage for document metadata and chunks

## Integration Steps

### Step 1: Update `internal/adapter/http/router.go`

#### 1.1 Add import for RAG handlers

Add this import at the top of the file:

```go
import (
    // ... existing imports ...
    raghttp "github.com/finch-co/cashflow/internal/rag/adapter/http"
)
```

#### 1.2 Update `RouterDeps` struct

Add the RAG handlers to the `RouterDeps` struct (around line 15):

```go
type RouterDeps struct {
    Validator   *auth.Validator // Optional - can be nil for demo mode
    Users       domain.UserRepository
    Memberships domain.MembershipRepository
    AuditRepo   domain.AuditLogRepository
    Tenants     *TenantHandler
    Members     *MemberHandler
    Audit       *AuditHandler
    Documents   *raghttp.DocumentHandler  // ADD THIS LINE
    Rag         *raghttp.RagHandler       // ADD THIS LINE
}
```

#### 1.3 Register RAG routes

In the `NewRouter` function, add the RAG routes inside the tenant-scoped group (around line 54-67):

```go
r.Route("/{tenantID}", func(r chi.Router) {
    r.Use(middleware.TenantFromRouteParam("tenantID"))
    r.Use(middleware.TenantRateLimit(100, time.Minute))

    r.Get("/", deps.Tenants.GetByID)

    // Members sub-resource
    r.Post("/members", deps.Members.AddMember)
    r.Get("/members", deps.Members.ListMembers)
    r.Delete("/members/{membershipID}", deps.Members.RemoveMember)

    // Role change
    r.Post("/roles", deps.Members.ChangeMemberRole)

    // ADD THESE LINES - RAG Document routes
    r.Route("/documents", func(r chi.Router) {
        deps.Documents.RegisterRoutes(r)
    })

    // ADD THESE LINES - RAG Query routes (future use)
    r.Route("/rag", func(r chi.Router) {
        deps.Rag.RegisterRoutes(r)
    })
})
```

### Step 2: Update `cmd/tenant-service/main.go`

#### 2.1 Add import for RAG bootstrap

Add this import at the top of the file:

```go
import (
    // ... existing imports ...
    "github.com/finch-co/cashflow/internal/rag"
)
```

#### 2.2 Initialize RAG bootstrap

After initializing the database pool and before creating the router, add:

```go
// Initialize RAG module
openaiAPIKey := os.Getenv("OPENAI_API_KEY")
if openaiAPIKey == "" {
    openaiAPIKey = "demo-key" // Fallback for demo mode
}
ragBootstrap := rag.NewBootstrap(pool, openaiAPIKey)
```

#### 2.3 Add RAG handlers to RouterDeps

When creating the `http.RouterDeps` struct, add the RAG handlers:

```go
deps := http.RouterDeps{
    Validator:   validator,
    Users:       userRepo,
    Memberships: membershipRepo,
    AuditRepo:   auditRepo,
    Tenants:     tenantHandler,
    Members:     memberHandler,
    Audit:       auditHandler,
    Documents:   ragBootstrap.DocumentHandler,  // ADD THIS LINE
    Rag:         ragBootstrap.RagHandler,       // ADD THIS LINE
}
```

## API Endpoints

After integration, the following endpoints will be available:

### Document Management

- **POST** `/tenants/{tenantID}/documents` - Upload a document
  - Form fields: `title` (string), `type` (pdf/docx/txt)
  - File field: `file` (max 25MB)
  - Returns: Document metadata with status "processing"
  - Processing happens asynchronously in the background

- **GET** `/tenants/{tenantID}/documents` - List all documents
  - Query params: `limit` (default 50), `offset` (default 0)
  - Returns: Paginated list of documents

- **GET** `/tenants/{tenantID}/documents/{documentID}` - Get document details
  - Returns: Document metadata including status and chunk count

- **DELETE** `/tenants/{tenantID}/documents/{documentID}` - Delete a document
  - Deletes document metadata, chunks, and stored file

### RAG Query (Future)

- **POST** `/tenants/{tenantID}/rag/query` - Ask a question (not implemented yet)
- **GET** `/tenants/{tenantID}/rag/queries` - List query history (not implemented yet)
- **GET** `/tenants/{tenantID}/rag/queries/{queryID}` - Get query details (not implemented yet)

## Testing the Integration

### 1. Compile the service

```bash
cd backend
go build -o bin/tenant-service ./cmd/tenant-service
```

### 2. Run the service

```bash
./bin/tenant-service
```

### 3. Test document upload

```bash
# Create a test tenant first
TENANT_ID=$(curl -X POST http://localhost:8080/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Tenant"}' | jq -r '.id')

# Upload a document
curl -X POST http://localhost:8080/tenants/$TENANT_ID/documents \
  -F "title=Test Document" \
  -F "type=txt" \
  -F "file=@test.txt"

# List documents
curl http://localhost:8080/tenants/$TENANT_ID/documents

# Get document details (use document ID from upload response)
curl http://localhost:8080/tenants/$TENANT_ID/documents/{documentID}
```

## File Storage

Uploaded documents are stored in:
```
./storage/documents/{tenantID}/{documentID}/original.{ext}
```

Make sure the `storage/documents` directory exists and is writable:

```bash
mkdir -p storage/documents
chmod 755 storage/documents
```

## Database Migrations

The RAG module requires the following migration to be applied:

```bash
migrate -path migrations -database "postgres://..." up
```

This creates the following tables:
- `documents` - Document metadata
- `document_chunks` - Text chunks with token counts
- `rag_queries` - Query history (for future use)

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key (optional, defaults to "demo-key")
  - Currently used for tokenization only
  - Will be used for embeddings and LLM in future phases

## Troubleshooting

### Import errors

If you see import errors, run:
```bash
go mod tidy
```

### Storage directory errors

If you see "no such file or directory" errors:
```bash
mkdir -p storage/documents
```

### Database errors

Make sure the RAG migrations have been applied:
```bash
migrate -path migrations -database "postgres://..." up
```

## Next Steps

After integration, you can:

1. Test document upload with PDF, DOCX, and TXT files
2. Verify async chunking is working (check document status changes to "ready")
3. Query the `document_chunks` table to see the generated chunks
4. Implement embedding generation (Phase 2)
5. Implement RAG query endpoint (Phase 3)
