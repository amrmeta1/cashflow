# Voyage AI Integration Guide

## Quick Start

### 1. Get Voyage API Key

Sign up at [https://www.voyageai.com/](https://www.voyageai.com/) and get your API key.

### 2. Set Environment Variable

```bash
export VOYAGE_API_KEY="pa-xxxxxxxxxxxxxxxxxxxxx"
```

### 3. Update main.go (if not already done)

The bootstrap already accepts the API key parameter. Update your `cmd/tenant-service/main.go`:

```go
// Read Voyage API key from environment
voyageAPIKey := os.Getenv("VOYAGE_API_KEY")
if voyageAPIKey == "" {
    log.Warn().Msg("VOYAGE_API_KEY not set, embeddings will be skipped")
}

// Initialize RAG bootstrap with Voyage key
ragBootstrap := rag.NewBootstrap(pool, voyageAPIKey)
```

### 4. Test the Pipeline

```bash
# Upload a document
curl -X POST http://localhost:8080/tenants/$TENANT_ID/documents \
  -F "title=Test Document" \
  -F "type=txt" \
  -F "file=@test.txt"

# Response will include document_id
# {
#   "id": "uuid-here",
#   "status": "processing",
#   "message": "Document uploaded successfully. Processing in background."
# }
```

### 5. Verify Embeddings

```sql
-- Check if embeddings are stored
SELECT 
    d.title,
    c.chunk_index,
    array_length(c.embedding, 1) as embedding_dimensions,
    LEFT(c.content, 50) as content_preview
FROM documents d
JOIN document_chunks c ON d.id = c.document_id
WHERE d.id = 'your-document-id'
ORDER BY c.chunk_index;
```

Expected output:
- `embedding_dimensions`: 1024
- All chunks should have embeddings

## Configuration Options

### Option 1: Voyage AI (Recommended)
```bash
export VOYAGE_API_KEY="your-voyage-key"
```

### Option 2: Skip Embeddings (Development)
```bash
# Don't set VOYAGE_API_KEY
# Documents will be chunked but not embedded
```

## Troubleshooting

### Issue: Embeddings not generated

**Check 1**: API key is set
```bash
echo $VOYAGE_API_KEY
```

**Check 2**: Check logs
```bash
# Look for:
# INFO - Voyage AI embeddings client initialized
# or
# WARN - VOYAGE_API_KEY not provided, embeddings will be skipped
```

**Check 3**: Check document status
```sql
SELECT id, title, status FROM documents WHERE id = 'your-doc-id';
```
- Status should be `ready` even if embeddings failed
- Check application logs for embedding errors

### Issue: API rate limits

Voyage AI has rate limits. If you hit them:
1. Check your plan limits at voyageai.com
2. Implement retry logic (future enhancement)
3. Use batch API calls (future enhancement)

### Issue: Wrong dimensions

Voyage-2 produces 1024 dimensions. The migration has 1536 (OpenAI size).
- pgvector is flexible and will accept 1024 dimensions
- No migration change needed
- Future: Can update migration to match Voyage dimensions

## API Costs

Voyage AI pricing (as of implementation):
- Charged per token
- voyage-2 model: Check current pricing at voyageai.com
- Typical document: 500-800 tokens per chunk
- Example: 10-page PDF ≈ 20 chunks ≈ 12,000 tokens

## Monitoring

### Check Embedding Success Rate

```sql
SELECT 
    COUNT(*) as total_chunks,
    COUNT(embedding) as chunks_with_embeddings,
    ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) as success_rate
FROM document_chunks
WHERE created_at > NOW() - INTERVAL '1 day';
```

### Check Recent Documents

```sql
SELECT 
    d.id,
    d.title,
    d.status,
    COUNT(c.id) as chunk_count,
    COUNT(c.embedding) as embedded_chunks,
    d.created_at
FROM documents d
LEFT JOIN document_chunks c ON d.id = c.document_id
WHERE d.created_at > NOW() - INTERVAL '1 hour'
GROUP BY d.id
ORDER BY d.created_at DESC;
```

## Next Steps

After embeddings are working:
1. Implement vector similarity search
2. Implement RAG query endpoint
3. Integrate LLM for answer generation
4. Add embedding caching
5. Optimize with batch API calls
