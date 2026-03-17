-- Rollback: Remove observability columns from rag_queries
DROP INDEX IF EXISTS idx_rag_queries_status;
DROP INDEX IF EXISTS idx_rag_queries_provider;
DROP INDEX IF EXISTS idx_rag_queries_latency;

ALTER TABLE rag_queries 
DROP COLUMN IF EXISTS provider,
DROP COLUMN IF EXISTS latency_ms,
DROP COLUMN IF EXISTS tokens_used,
DROP COLUMN IF EXISTS status;
