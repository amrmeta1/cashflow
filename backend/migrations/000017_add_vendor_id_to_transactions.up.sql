-- Add vendor_id column to bank_transactions for vendor identity resolution

ALTER TABLE bank_transactions
ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;

-- Index for vendor-based queries
CREATE INDEX idx_bank_txn_vendor ON bank_transactions(vendor_id);

-- Add column comment
COMMENT ON COLUMN bank_transactions.vendor_id IS 'Resolved canonical vendor identity';
