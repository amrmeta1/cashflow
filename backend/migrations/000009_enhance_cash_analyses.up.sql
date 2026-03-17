-- Add metadata columns to cash_analyses for versioning and traceability
-- Enables tracking of analysis improvements and data lineage

ALTER TABLE cash_analyses 
ADD COLUMN source_reference TEXT,
ADD COLUMN analysis_version TEXT;

-- Add index for version-based queries
CREATE INDEX idx_cash_analyses_version ON cash_analyses(analysis_version);

-- Add explanatory comments
COMMENT ON COLUMN cash_analyses.source_reference IS 
'Reference to source data or trigger (e.g., ingestion_job_id, manual_trigger, scheduled_analysis)';

COMMENT ON COLUMN cash_analyses.analysis_version IS 
'Analysis algorithm version (e.g., v1.0, v2.1) for tracking improvements and A/B testing';
