-- Remove unique index for vendor rules

DROP INDEX IF EXISTS idx_vendor_rules_unique_pattern_category;
