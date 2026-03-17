# RAG Module Integration - Quick Reference

## ✅ Implementation Complete

The RAG document ingestion pipeline has been fully implemented and is ready for integration.

## 📁 Files Created

### Core Implementation
- `internal/rag/bootstrap.go` - Bootstrap initialization (NEW)
- `internal/rag/adapter/parser/pdf_parser.go` - PDF parsing
- `internal/rag/adapter/parser/docx_parser.go` - DOCX parsing  
- `internal/rag/adapter/parser/text_parser.go` - TXT parsing
- `internal/rag/adapter/storage/file_storage.go` - Local file storage
- `internal/rag/usecase/chunker.go` - Token-based text chunking
- `internal/rag/usecase/ingest_document.go` - Document ingestion
- `internal/rag/usecase/chunk_document.go` - Document chunking
- `internal/rag/adapter/http/document_handler.go` - HTTP handlers

### Documentation
- `INTEGRATION_INSTRUCTIONS.md` - Detailed integration guide
- `RAG_INTEGRATION_SUMMARY.md` - This file

## 🚀 Quick Integration (3 Steps)

### Step 1: Update `internal/adapter/http/router.go`

Add import:
```go
raghttp "github.com/finch-co/cashflow/internal/rag/adapter/http"
```

Add to `RouterDeps`:
```go
Documents *raghttp.DocumentHandler
Rag       *raghttp.RagHandler
```

Add routes in `NewRouter` (inside `/{tenantID}` group):
```go
// RAG Document routes
r.Route("/documents", func(r chi.Router) {
    deps.Documents.RegisterRoutes(r)
})

// RAG Query routes (future)
r.Route("/rag", func(r chi.Router) {
    deps.Rag.RegisterRoutes(r)
})
```

### Step 2: Update `cmd/tenant-service/main.go`

Add import:
```go
"github.com/finch-co/cashflow/internal/rag"
```

Initialize bootstrap (after pool creation):
```go
openaiAPIKey := os.Getenv("OPENAI_API_KEY")
if openaiAPIKey == "" {
    openaiAPIKey = "demo-key"
}
ragBootstrap := rag.NewBootstrap(pool, openaiAPIKey)
```

Add to RouterDeps:
```go
Documents: ragBootstrap.DocumentHandler,
Rag:       ragBootstrap.RagHandler,
```

### Step 3: Create storage directory

```bash
mkdir -p storage/documents
```

## 📋 API Endpoints

After integration, these endpoints will be available:

- `POST /tenants/{tenantID}/documents` - Upload document (PDF/DOCX/TXT, max 25MB)
- `GET /tenants/{tenantID}/documents` - List documents
- `GET /tenants/{tenantID}/documents/{documentID}` - Get document details
- `DELETE /tenants/{tenantID}/documents/{documentID}` - Delete document

## 🧪 Test Upload

```bash
# Get tenant ID
TENANT_ID="your-tenant-id"

# Upload a document
curl -X POST http://localhost:8080/tenants/$TENANT_ID/documents \
  -F "title=Test Document" \
  -F "type=txt" \
  -F "file=@test.txt"

# List documents
curl http://localhost:8080/tenants/$TENANT_ID/documents
```

## ✨ Features Implemented

- ✅ Document upload (PDF, DOCX, TXT)
- ✅ File size limit (25MB)
- ✅ Async background processing
- ✅ Token-based chunking (500-800 tokens, 50-80 overlap)
- ✅ Local file storage
- ✅ PostgreSQL metadata storage
- ✅ Multi-tenant support
- ✅ Document CRUD operations

## 📊 Database Tables

- `documents` - Document metadata
- `document_chunks` - Text chunks with token counts
- `rag_queries` - Query history (for future use)

## 🔧 Dependencies Added

- `github.com/ledongthuc/pdf` - PDF parsing
- `github.com/nguyenthenguyen/docx` - DOCX parsing
- `github.com/pkoukk/tiktoken-go` - Token counting

## 📝 Next Steps

1. Apply the 3 integration steps above
2. Run `go mod tidy`
3. Compile and test the service
4. Upload test documents
5. Verify async chunking works
6. Check `document_chunks` table for results

For detailed instructions, see `INTEGRATION_INSTRUCTIONS.md`.
