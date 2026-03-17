-- RAG (Retrieval-Augmented Generation) Foundation Schema
-- Financial document ingestion, chunking, and vector search
-- Managed by golang-migrate

-- Note: pgvector extension removed for compatibility
-- Embeddings stored as TEXT (JSON array) for now

-- ============================================================
-- DOCUMENTS
-- Stores uploaded financial documents (policies, contracts, reports, etc.)
-- ============================================================
CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    type        TEXT NOT NULL,
    file_name   TEXT,
    mime_type   TEXT,
    source      TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status      TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_type ON documents(type);

-- ============================================================
-- DOCUMENT_CHUNKS
-- Stores chunked text segments with vector embeddings
-- ============================================================
CREATE TABLE document_chunks (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index  INT NOT NULL,
    content      TEXT NOT NULL,
    embedding    TEXT,
    metadata     JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_tenant ON document_chunks(tenant_id);

-- ============================================================
-- RAG_QUERIES
-- Stores RAG query history with answers and citations
-- ============================================================
CREATE TABLE rag_queries (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    question    TEXT NOT NULL,
    answer      TEXT,
    citations   JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rag_queries_tenant ON rag_queries(tenant_id);
CREATE INDEX idx_rag_queries_created ON rag_queries(created_at);
