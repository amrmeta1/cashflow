-- Verify documents.type has no restrictive CHECK constraint
-- Migration 000005 already removed it, this ensures it stays flexible
-- Document type validation is handled in application layer for maximum flexibility

DO $$
BEGIN
    -- Drop constraint if it somehow exists (defensive)
    ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
    
    -- Add comment confirming flexibility
    COMMENT ON COLUMN documents.type IS 
    'Document type - supports both file extensions (pdf, docx, txt, xlsx, csv) and semantic types (policy, contract, report, statement, faq). Validation handled in application layer for flexibility.';
    
    RAISE NOTICE 'documents.type constraint verification complete - type is flexible';
END $$;
