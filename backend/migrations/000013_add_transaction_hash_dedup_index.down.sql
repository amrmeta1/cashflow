-- Remove transaction deduplication index

DROP INDEX IF EXISTS idx_transactions_dedup_hash;
