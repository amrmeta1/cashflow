-- Enhance vendor_stats table to track inflows and outflows separately

-- Add new columns for inflow/outflow tracking
ALTER TABLE vendor_stats 
ADD COLUMN total_inflow NUMERIC(20,2) NOT NULL DEFAULT 0,
ADD COLUMN total_outflow NUMERIC(20,2) NOT NULL DEFAULT 0,
ADD COLUMN inflow_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN outflow_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN avg_inflow NUMERIC(20,2) NOT NULL DEFAULT 0,
ADD COLUMN avg_outflow NUMERIC(20,2) NOT NULL DEFAULT 0;

-- Update existing records to populate new columns based on total_spend
-- Assuming negative amounts are outflows (expenses) and positive are inflows (revenue)
UPDATE vendor_stats 
SET 
  total_outflow = CASE WHEN total_spend < 0 THEN ABS(total_spend) ELSE 0 END,
  total_inflow = CASE WHEN total_spend >= 0 THEN total_spend ELSE 0 END,
  outflow_count = CASE WHEN total_spend < 0 THEN transaction_count ELSE 0 END,
  inflow_count = CASE WHEN total_spend >= 0 THEN transaction_count ELSE 0 END,
  avg_outflow = CASE WHEN total_spend < 0 THEN ABS(avg_transaction) ELSE 0 END,
  avg_inflow = CASE WHEN total_spend >= 0 THEN avg_transaction ELSE 0 END;

-- Add comments for new columns
COMMENT ON COLUMN vendor_stats.total_inflow IS 'Total amount received from this vendor (positive transactions)';
COMMENT ON COLUMN vendor_stats.total_outflow IS 'Total amount paid to this vendor (negative transactions, stored as positive)';
COMMENT ON COLUMN vendor_stats.inflow_count IS 'Number of inflow transactions (revenue/receipts)';
COMMENT ON COLUMN vendor_stats.outflow_count IS 'Number of outflow transactions (expenses/payments)';
COMMENT ON COLUMN vendor_stats.avg_inflow IS 'Average inflow transaction amount';
COMMENT ON COLUMN vendor_stats.avg_outflow IS 'Average outflow transaction amount';

-- Update comment for total_spend to clarify it's net amount
COMMENT ON COLUMN vendor_stats.total_spend IS 'Net amount (total_inflow - total_outflow)';
