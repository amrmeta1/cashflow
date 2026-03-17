-- Rollback RAG schema

DROP TABLE IF EXISTS rag_queries;
DROP TABLE IF EXISTS document_chunks;
DROP TABLE IF EXISTS documents;

-- Note: We keep the vector extension as it may be used by other features
-- DROP EXTENSION IF EXISTS vector;
