# إعداد قاعدة البيانات للـ RAG System

## المشكلة
جدول `documents` غير موجود في قاعدة البيانات.

## الحل السريع

### الطريقة 1: استخدام Docker (الأسهل)

```bash
# إذا عندك Docker، شغل PostgreSQL مع pgvector
docker exec -i cashflow-db psql -U cashflow -d cashflow < backend/migrations/000004_rag_documents.up.sql
```

### الطريقة 2: استخدام psql مباشرة

```bash
# إذا عندك PostgreSQL مثبت
cd backend/migrations
psql -h localhost -U cashflow -d cashflow -f 000004_rag_documents.up.sql
```

### الطريقة 3: نسخ ولصق SQL (الأضمن)

1. افتح أي PostgreSQL client (pgAdmin, DBeaver, أو psql)
2. اتصل بقاعدة البيانات `cashflow`
3. نفذ هذا الكود SQL:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('policy', 'contract', 'report', 'statement', 'faq', 'pdf', 'docx', 'txt')),
    file_name   TEXT,
    mime_type   TEXT,
    source      TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status      TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);

-- Document chunks table
CREATE TABLE IF NOT EXISTS document_chunks (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index  INT NOT NULL,
    content      TEXT NOT NULL,
    embedding    VECTOR(1536),
    metadata     JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks 
    USING hnsw (embedding vector_cosine_ops);

-- RAG queries table
CREATE TABLE IF NOT EXISTS rag_queries (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    question    TEXT NOT NULL,
    answer      TEXT,
    citations   JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_queries_tenant ON rag_queries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_queries_created ON rag_queries(created_at);
```

## التحقق من نجاح الإعداد

```bash
# اختبر رفع ملف
curl -X POST "http://localhost:8081/tenants/00000000-0000-0000-0000-000000000001/documents" \
  -F "title=Test Document" \
  -F "type=txt" \
  -F "file=@test.txt"
```

## ملاحظة مهمة

إذا ظهرت رسالة خطأ عن `pgvector`، لازم تثبت الـ extension:

```sql
-- في PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;
```

إذا ما اشتغل، تحتاج تثبت pgvector على السيرفر:
- macOS: `brew install pgvector`
- Ubuntu: `apt install postgresql-15-pgvector`
- Docker: استخدم image يحتوي على pgvector مثل `pgvector/pgvector:pg15`

---

**بعد تنفيذ الـ SQL، جرب رفع الملف مرة ثانية من الواجهة! 🚀**
