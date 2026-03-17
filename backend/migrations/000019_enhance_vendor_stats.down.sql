-- Revert vendor_stats enhancements

ALTER TABLE vendor_stats 
DROP COLUMN IF EXISTS total_inflow,
DROP COLUMN IF EXISTS total_outflow,
DROP COLUMN IF EXISTS inflow_count,
DROP COLUMN IF EXISTS outflow_count,
DROP COLUMN IF EXISTS avg_inflow,
DROP COLUMN IF EXISTS avg_outflow;
