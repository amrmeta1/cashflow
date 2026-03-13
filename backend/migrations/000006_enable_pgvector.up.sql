-- Enable pgvector extension for vector similarity search
-- This extension provides vector data types and similarity search operations
-- Required for efficient semantic search on document embeddings
CREATE EXTENSION IF NOT EXISTS vector;
