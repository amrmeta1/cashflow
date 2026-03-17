-- Remove vendor_id column from bank_transactions

ALTER TABLE bank_transactions
DROP COLUMN IF EXISTS vendor_id;
