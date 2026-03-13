-- Rollback: remove the constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
