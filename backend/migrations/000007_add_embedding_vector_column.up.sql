-- Add pgvector column to document_chunks for efficient similarity search
-- Dimension: 1024 (normalized for Voyage/OpenAI compatibility)
-- Keeps existing TEXT embedding column for backward compatibility

ALTER TABLE document_chunks 
ADD COLUMN embedding_vector vector(1024);

-- Add vector similarity index using ivfflat with cosine distance
-- Note: Requires at least 1000 rows for optimal performance
-- lists parameter: number of clusters (typically sqrt of expected row count)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_vector
ON document_chunks
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- Add explanatory comments
COMMENT ON COLUMN document_chunks.embedding IS 
'Legacy TEXT embedding (JSON array) - kept for backward compatibility during migration';

COMMENT ON COLUMN document_chunks.embedding_vector IS 
'pgvector embedding (1024 dimensions) - normalized for Voyage/OpenAI compatibility. Use this for similarity search.';
