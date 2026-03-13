-- Add unique index for transaction deduplication using hash
-- Hash format: SHA256({tenant_id}|{account_id}|{date}|{amount}|{description})

-- The hash column should already exist from the ingestion schema
-- This migration adds a unique index to enforce deduplication

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_dedup_hash
ON bank_transactions (tenant_id, account_id, hash);

-- Add comment for documentation
COMMENT ON INDEX idx_transactions_dedup_hash IS 
'Ensures transaction deduplication per tenant and account using SHA256 hash. Hash format: {tenant_id}|{account_id}|{date}|{amount}|{description}';
