-- Rollback: Remove metadata columns from cash_analyses
DROP INDEX IF EXISTS idx_cash_analyses_version;
ALTER TABLE cash_analyses 
DROP COLUMN IF EXISTS source_reference,
DROP COLUMN IF EXISTS analysis_version;
