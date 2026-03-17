-- Rollback AI classification columns from bank_transactions table

DROP INDEX IF EXISTS idx_bank_transactions_ai_category;
DROP INDEX IF EXISTS idx_bank_transactions_ai_classified;

ALTER TABLE bank_transactions
DROP COLUMN IF EXISTS ai_vendor_name,
DROP COLUMN IF EXISTS ai_category,
DROP COLUMN IF EXISTS ai_confidence,
DROP COLUMN IF EXISTS ai_classified;
