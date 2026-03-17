-- ============================================================
-- Migration 002: Tadfuq — Tenant-scoped RAG Schema
-- ============================================================
-- RULE: RAG is for explanation, policy, contracts, and reports ONLY.
--       Do NOT store forecast or model output here.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- Tenants
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rag_tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------
-- Documents  (tenant-scoped)
-- Allowed categories: policy | contract | report | regulation | explanation
-- FORBIDDEN:          forecast | model  (use the forecasting engine instead)
-- ------------------------------------------------------------
CREATE TYPE rag_doc_category AS ENUM (
    'policy',
    'contract',
    'report',
    'regulation',
    'explanation'
);

CREATE TABLE IF NOT EXISTS rag_documents (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID            NOT NULL REFERENCES rag_tenants(id) ON DELETE CASCADE,
    name        VARCHAR(500)    NOT NULL,
    file_type   VARCHAR(50)     NOT NULL,   -- pdf | docx | jpeg | png | webp
    category    rag_doc_category NOT NULL,
    file_size   BIGINT          NOT NULL,
    page_count  INT             NOT NULL DEFAULT 1,
    status      VARCHAR(30)     NOT NULL DEFAULT 'processing', -- processing | ready | failed
    metadata    JSONB           NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Tenant-scoped lookups
CREATE INDEX IF NOT EXISTS rag_documents_tenant_idx
    ON rag_documents (tenant_id);

CREATE INDEX IF NOT EXISTS rag_documents_tenant_status_idx
    ON rag_documents (tenant_id, status);

-- ------------------------------------------------------------
-- Chunks  (tenant_id denormalised for fast, isolated vector search)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rag_chunks (
    id           UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID     NOT NULL REFERENCES rag_tenants(id)   ON DELETE CASCADE,
    document_id  UUID     NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
    content      TEXT     NOT NULL,
    chunk_index  INT      NOT NULL,
    page_number  INT      NOT NULL DEFAULT 1,
    -- voyage-finance-2 → 1024 dimensions
    embedding    vector(1024),
    metadata     JSONB    NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast document-level joins
CREATE INDEX IF NOT EXISTS rag_chunks_document_idx
    ON rag_chunks (document_id);

-- Tenant isolation index (used in WHERE before ANN)
CREATE INDEX IF NOT EXISTS rag_chunks_tenant_idx
    ON rag_chunks (tenant_id);

-- HNSW index for approximate nearest-neighbour search (cosine distance)
-- NOTE: pgvector will combine with tenant_id filter using a sequential scan
-- on the tenant sub-set. For very large tenants consider IVFFlat with
-- a per-tenant probes strategy.
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_hnsw_idx
    ON rag_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ------------------------------------------------------------
-- Query Sessions  (tenant-scoped conversation history)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rag_query_sessions (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID        NOT NULL REFERENCES rag_tenants(id) ON DELETE CASCADE,
    label       VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rag_query_sessions_tenant_idx
    ON rag_query_sessions (tenant_id);

-- ------------------------------------------------------------
-- Query Messages  (user + assistant turns)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rag_query_messages (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID        NOT NULL REFERENCES rag_query_sessions(id) ON DELETE CASCADE,
    tenant_id   UUID        NOT NULL REFERENCES rag_tenants(id)        ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    metadata    JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rag_query_messages_session_idx
    ON rag_query_messages (session_id);
