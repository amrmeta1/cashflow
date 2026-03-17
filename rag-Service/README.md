# Financial RAG - AI-Powered Financial Statement Analysis

A production-ready Retrieval-Augmented Generation (RAG) system for analyzing financial documents using Claude AI and Voyage embeddings.

## Features

- **Multi-format Document Support**: PDF, DOCX, JPG, PNG, GIF, WEBP
- **Smart Text Extraction**: Native PDF parsing with fallback to Claude vision for scanned documents
- **Vector Embeddings**: Uses Voyage Finance-2 model specialized for financial documents
- **Semantic Search**: Fast similarity search using pgvector HNSW indexes
- **Conversational AI**: Claude-powered chat with conversation history
- **Structured Data Extraction**: Extract financial metrics in JSON format
- **REST API**: Production-grade HTTP API with Gin
- **CLI Tool**: Command-line interface for all operations
- **Docker Support**: Complete Docker Compose setup

## Tech Stack

- **Language**: Go 1.22
- **LLM**: Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)
- **Embeddings**: Voyage Finance-2 (1024-dim vectors)
- **Vector DB**: PostgreSQL + pgvector
- **Web Framework**: Gin
- **CLI Framework**: Cobra
- **Database**: PostgreSQL 16
- **Containerization**: Docker & Docker Compose

## Architecture

```
Documents → Processor (Claude Vision) → Chunker → Embeddings (Voyage) → PostgreSQL
                                                                              ↓
                                                        Similarity Search ← Query
                                                              ↓
                                                        Claude Chat → Answer
```

## Quick Start

### Prerequisites

- Go 1.22+
- PostgreSQL 16+ with pgvector
- Docker & Docker Compose (optional)
- API Keys:
  - `ANTHROPIC_API_KEY`: From https://console.anthropic.com
  - `VOYAGE_API_KEY`: From https://www.voyageai.com

### Local Setup

1. Clone the repository:
```bash
cd /sessions/eager-funny-lamport/mnt/RAG/rag-service
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Start PostgreSQL:
```bash
docker run -d \
  --name rag-service-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=financial_rag \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  -v ./migrations:/docker-entrypoint-initdb.d \
  pgvector/pgvector:pg16
```

4. Install dependencies:
```bash
go mod download
```

5. Run migrations:
```bash
psql -h localhost -U postgres -d financial_rag -f migrations/001_init.sql
```

6. Start API server:
```bash
go run ./cmd/api/main.go
```

The API will be available at `http://localhost:8080`

### Docker Compose

```bash
docker-compose up -d
```

Access the API at `http://localhost:8080`

## API Endpoints

### Health Check
```bash
GET /health
```

### Document Management

**Ingest Document** (multipart/form-data)
```bash
POST /api/v1/documents
Content-Type: multipart/form-data

file: <binary>
```

Response:
```json
{
  "message": "Document ingested successfully",
  "document": {
    "id": "uuid",
    "name": "financial_report.pdf",
    "file_type": "pdf",
    "page_count": 42,
    "created_at": "2026-03-08T..."
  }
}
```

**List Documents**
```bash
GET /api/v1/documents
```

**Delete Document**
```bash
DELETE /api/v1/documents/{id}
```

**Extract Structured Data**
```bash
POST /api/v1/documents/{id}/extract
```

### Chat

**Query Documents**
```bash
POST /api/v1/chat
Content-Type: application/json

{
  "question": "What was the total revenue in Q4?",
  "session_id": "optional-uuid"  // omit for new session
}
```

Response:
```json
{
  "session_id": "uuid",
  "answer": "The total revenue in Q4 was...",
  "sources": [
    {
      "document_name": "financial_report.pdf",
      "page_number": 5,
      "similarity": 0.89,
      "content": "..."
    }
  ]
}
```

## CLI Commands

### Ingest a Document
```bash
go run ./cmd/cli/main.go ingest ./financial_report.pdf
```

### Query Documents
```bash
go run ./cmd/cli/main.go query "What was the revenue in Q4?"
```

Continue conversation with session:
```bash
go run ./cmd/cli/main.go query "What about expenses?" \
  --session=<session-uuid>
```

### List Documents
```bash
go run ./cmd/cli/main.go list
```

### Extract Structured Data
```bash
go run ./cmd/cli/main.go extract <document-id> \
  --output=extracted.json
```

### Delete Document
```bash
go run ./cmd/cli/main.go delete <document-id>
```

## Configuration

Environment variables in `.env`:

```env
# API Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=financial_rag
DB_SSLMODE=disable

# AI Providers
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...

# RAG Settings
CHUNK_SIZE=800              # Target chunk size in characters
CHUNK_OVERLAP=100           # Overlap between chunks for context
TOP_K=5                     # Number of sources to retrieve
```

## Project Structure

```
rag-service/
├── cmd/
│   ├── api/main.go              # API server entrypoint
│   └── cli/main.go              # CLI tool entrypoint
├── internal/
│   ├── api/
│   │   ├── handlers.go          # HTTP request handlers
│   │   └── router.go            # Gin route configuration
│   ├── config/
│   │   └── config.go            # Configuration management
│   ├── db/
│   │   └── postgres.go          # Database operations
│   ├── embeddings/
│   │   └── voyage.go            # Voyage AI client
│   ├── llm/
│   │   └── claude.go            # Claude AI client
│   ├── processor/
│   │   └── document.go          # Document text extraction
│   ├── models/
│   │   └── models.go            # Data models
│   └── rag/
│       ├── chunker.go           # Document chunking
│       ├── pipeline.go          # RAG orchestration
│       └── retriever.go         # (future) Advanced retrieval
├── migrations/
│   └── 001_init.sql             # Database schema
├── docker-compose.yml           # Docker Compose setup
├── Dockerfile                   # Container build
├── go.mod                       # Go module definition
└── README.md                    # This file
```

## How It Works

### Document Ingestion

1. **Upload**: Multipart form submission
2. **Extract**: Claude vision or native parser extracts text
3. **Chunk**: Intelligent sentence-aware chunking with overlap
4. **Embed**: Voyage Finance-2 creates vector embeddings
5. **Store**: Chunks stored with embeddings in PostgreSQL

### Query Processing

1. **Embed**: Query converted to vector via Voyage
2. **Search**: Similarity search returns top-K chunks
3. **Context**: Retrieved chunks formatted as LLM context
4. **Chat**: Claude answers based on document context
5. **Store**: Conversation saved in session

### Structured Extraction

1. **Fetch**: Get document chunks
2. **Parse**: Send to Claude with extraction prompt
3. **JSON**: Return structured financial data

## Performance Considerations

- **Chunk Size**: 800 characters balances context and relevance
- **Vector Index**: HNSW with m=16, ef=64 for speed/quality
- **Batch Embedding**: Processes up to 128 chunks per API call
- **Connection Pool**: 25 max connections to PostgreSQL
- **Timeouts**: 5-minute timeout for large document ingestion

## Security Notes

- Store API keys in `.env` (not in version control)
- Use SSL/TLS in production for database connections
- Implement authentication for API endpoints
- Rate limit the endpoints
- Validate file uploads (type, size)

## Development

### Testing

```bash
# Run tests (to be implemented)
go test ./...

# Integration tests with local PostgreSQL
go test -tags=integration ./...
```

### Building

```bash
# Build API server
go build -o api ./cmd/api

# Build CLI tool
go build -o cli ./cmd/cli

# Build Docker image
docker build -t rag-service:latest .
```

## Troubleshooting

**PostgreSQL Connection Error**
```
Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env
Verify PostgreSQL is running: docker ps | grep postgres
```

**pgvector Extension Not Found**
```
Connect to PostgreSQL and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

**API Keys Invalid**
```
Verify ANTHROPIC_API_KEY and VOYAGE_API_KEY in .env
Test connectivity to APIs from terminal
```

**Out of Memory During Embedding**
```
Reduce CHUNK_SIZE or increase system memory
Process documents in smaller batches
```

## Future Enhancements

- [ ] Advanced retriever with re-ranking
- [ ] Batch document ingestion
- [ ] Export to various formats
- [ ] Custom prompts and roles
- [ ] Document comparison analysis
- [ ] Real-time indexing updates
- [ ] Web UI dashboard
- [ ] Multi-language support
- [ ] Fine-tuned financial models

## License

MIT License - See LICENSE file

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs: `docker logs rag-service-api`
3. Check database: `psql -h localhost -U postgres -d financial_rag`
