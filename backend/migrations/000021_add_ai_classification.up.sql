-- Add AI classification columns to bank_transactions table
-- This enables automatic transaction classification using AI

ALTER TABLE bank_transactions
ADD COLUMN ai_vendor_name TEXT,
ADD COLUMN ai_category TEXT,
ADD COLUMN ai_confidence NUMERIC DEFAULT 0.0,
ADD COLUMN ai_classified BOOLEAN DEFAULT FALSE;

-- Index for efficient querying of unclassified transactions
CREATE INDEX idx_bank_transactions_ai_classified 
ON bank_transactions(tenant_id, ai_classified) 
WHERE ai_classified = FALSE;

-- Index for querying by AI category
CREATE INDEX idx_bank_transactions_ai_category 
ON bank_transactions(tenant_id, ai_category) 
WHERE ai_category IS NOT NULL;
