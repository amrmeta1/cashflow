-- Rollback: Remove pgvector column and index
DROP INDEX IF EXISTS idx_document_chunks_embedding_vector;
ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding_vector;
