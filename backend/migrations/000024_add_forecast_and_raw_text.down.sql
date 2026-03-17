-- Drop cash_forecasts table
DROP TABLE IF EXISTS cash_forecasts;

-- Drop raw_text index
DROP INDEX IF EXISTS idx_bank_transactions_raw_text;

-- Remove raw_text column from bank_transactions
ALTER TABLE bank_transactions 
DROP COLUMN IF EXISTS raw_text;
