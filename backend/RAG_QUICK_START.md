# RAG Query Pipeline - Quick Start Guide

## Setup

### 1. Get API Keys

**Voyage AI** (for embeddings):
- Sign up at https://www.voyageai.com/
- Get API key from dashboard

**Anthropic Claude** (for answers):
- Sign up at https://console.anthropic.com/
- Get API key from settings

### 2. Set Environment Variables

```bash
export VOYAGE_API_KEY="pa-xxxxxxxxxxxxxxxxxxxxx"
export ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxxx"
```

### 3. Update main.go

```go
// Read API keys
voyageAPIKey := os.Getenv("VOYAGE_API_KEY")
claudeAPIKey := os.Getenv("ANTHROPIC_API_KEY")

// Initialize RAG bootstrap
ragBootstrap := rag.NewBootstrap(pool, voyageAPIKey, claudeAPIKey)
```

## Usage

### Step 1: Upload Document

```bash
curl -X POST http://localhost:8080/tenants/$TENANT_ID/documents \
  -F "title=Company Policy" \
  -F "type=pdf" \
  -F "file=@policy.pdf"
```

**Response**:
```json
{
  "id": "doc-uuid",
  "status": "processing",
  "message": "Document uploaded successfully"
}
```

### Step 2: Wait for Processing

The document will be:
1. Parsed (PDF → text)
2. Chunked (500-800 tokens)
3. Embedded (Voyage AI)
4. Indexed (pgvector)

Check status:
```sql
SELECT id, title, status FROM documents WHERE id = 'doc-uuid';
```

Status should be `ready`.

### Step 3: Ask Questions

```bash
curl -X POST http://localhost:8080/tenants/$TENANT_ID/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the vacation policy?"
  }'
```

**Response**:
```json
{
  "answer": "According to the company policy, employees are entitled to 15 days of paid vacation per year. Vacation days must be requested at least 2 weeks in advance and approved by the manager.",
  "citations": [
    {
      "document_id": "doc-uuid",
      "chunk_id": "chunk-uuid-1",
      "content": "Employees are entitled to 15 days of paid vacation..."
    },
    {
      "document_id": "doc-uuid",
      "chunk_id": "chunk-uuid-2",
      "content": "Vacation requests must be submitted 2 weeks in advance..."
    }
  ]
}
```

### Step 4: View Query History

```bash
curl http://localhost:8080/tenants/$TENANT_ID/rag/queries
```

**Response**:
```json
{
  "queries": [
    {
      "id": "query-uuid",
      "question": "What is the vacation policy?",
      "answer": "...",
      "created_at": "2026-03-09T00:30:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

## How It Works

### RAG Pipeline

```
Question → Embedding → Vector Search → Top 5 Chunks → Context → Claude → Answer
```

1. **Question**: User submits question
2. **Embedding**: Voyage AI generates query embedding
3. **Vector Search**: pgvector finds similar chunks
4. **Top 5 Chunks**: Most relevant document segments
5. **Context**: Chunks assembled into prompt
6. **Claude**: AI generates answer from context
7. **Answer**: Response with citations

### Example Prompt

```
You are a treasury AI assistant for the Tadfuq platform.

Use ONLY the provided context documents.
Do NOT invent facts.
If the answer is not found in the context, say:
"I don't have enough information in the available documents."

Answer clearly and concisely.
When relevant, reference the supporting documents.

Context:

[Document 1]
Employees are entitled to 15 days of paid vacation per year...

[Document 2]
Vacation requests must be submitted 2 weeks in advance...

Question: What is the vacation policy?
```

## Troubleshooting

### Issue: "search use case not configured"

**Cause**: VOYAGE_API_KEY not set

**Fix**:
```bash
export VOYAGE_API_KEY="your-key"
```

### Issue: "LLM client not configured"

**Cause**: ANTHROPIC_API_KEY not set

**Fix**:
```bash
export ANTHROPIC_API_KEY="your-key"
```

### Issue: No results found

**Cause**: Document not embedded yet

**Fix**: Wait for document processing to complete

**Check**:
```sql
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;
```

### Issue: Answer says "I don't have enough information"

**Possible causes**:
1. Question not related to documents
2. Documents don't contain relevant information
3. Embeddings not generated

**Fix**: Upload relevant documents or rephrase question

## API Reference

### POST /tenants/{tenantID}/rag/query

Ask a question and get AI-generated answer.

**Request**:
```json
{
  "question": "string (required)"
}
```

**Response**:
```json
{
  "answer": "string",
  "citations": [
    {
      "document_id": "uuid",
      "chunk_id": "uuid",
      "content": "string"
    }
  ]
}
```

**Errors**:
- `400`: Invalid request (missing question)
- `500`: Processing error

### GET /tenants/{tenantID}/rag/queries

List query history.

**Response**:
```json
{
  "queries": [...],
  "total": number,
  "limit": number,
  "offset": number
}
```

### GET /tenants/{tenantID}/rag/queries/{queryID}

Get specific query details.

**Response**:
```json
{
  "id": "uuid",
  "question": "string",
  "answer": "string",
  "citations": {...},
  "created_at": "timestamp"
}
```

## Best Practices

### Document Upload
- Upload clear, well-formatted documents
- Use descriptive titles
- Supported formats: PDF, DOCX, TXT
- Max size: 25MB

### Questions
- Be specific and clear
- Ask one question at a time
- Reference document topics
- Avoid overly broad questions

### Performance
- First query may be slower (cold start)
- Subsequent queries faster (warm cache)
- Typical latency: 1-4 seconds

## Monitoring

### Check Embeddings
```sql
SELECT 
    COUNT(*) as total_chunks,
    COUNT(embedding) as embedded_chunks,
    ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) as success_rate
FROM document_chunks;
```

### Check Recent Queries
```sql
SELECT 
    question,
    LEFT(answer, 100) as answer_preview,
    created_at
FROM rag_queries
ORDER BY created_at DESC
LIMIT 10;
```

### Check Document Status
```sql
SELECT 
    title,
    status,
    created_at
FROM documents
ORDER BY created_at DESC;
```

## Next Steps

1. Upload your first document
2. Ask a question
3. Review the answer and citations
4. Iterate and improve document quality
5. Monitor query patterns
6. Optimize for your use case

The RAG pipeline is ready to use!
