-- Add observability and performance tracking columns to rag_queries
-- Enables monitoring of AI provider performance, costs, and reliability

ALTER TABLE rag_queries 
ADD COLUMN provider TEXT,
ADD COLUMN latency_ms INTEGER,
ADD COLUMN tokens_used INTEGER,
ADD COLUMN status TEXT NOT NULL DEFAULT 'completed' 
    CHECK (status IN ('pending', 'completed', 'failed', 'timeout'));

-- Add indexes for monitoring and analytics
CREATE INDEX idx_rag_queries_status ON rag_queries(status);
CREATE INDEX idx_rag_queries_provider ON rag_queries(provider);
CREATE INDEX idx_rag_queries_latency ON rag_queries(latency_ms) WHERE latency_ms IS NOT NULL;

-- Add explanatory comments
COMMENT ON COLUMN rag_queries.provider IS 
'AI provider used for this query (openai, voyage, anthropic, cohere, etc.)';

COMMENT ON COLUMN rag_queries.latency_ms IS 
'Query latency in milliseconds for performance monitoring and SLA tracking';

COMMENT ON COLUMN rag_queries.tokens_used IS 
'Total tokens consumed (prompt + completion) for cost tracking and optimization';

COMMENT ON COLUMN rag_queries.status IS 
'Query execution status: pending (queued), completed (success), failed (error), timeout (exceeded limit)';
