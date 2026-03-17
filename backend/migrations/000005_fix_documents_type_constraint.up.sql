-- Fix documents type constraint to allow dynamic file types
-- Drop the restrictive CHECK constraint entirely
-- This allows both file extensions (pdf, docx, txt) and semantic types (policy, contract, etc.)
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
