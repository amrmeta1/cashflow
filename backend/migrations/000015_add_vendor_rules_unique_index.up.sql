-- Add unique index to prevent duplicate vendor rules
-- A tenant cannot have duplicate rules for the same pattern + category combination

CREATE UNIQUE INDEX idx_vendor_rules_unique_pattern_category 
ON vendor_rules(tenant_id, normalized_pattern, category)
WHERE status = 'active';

COMMENT ON INDEX idx_vendor_rules_unique_pattern_category IS 'Ensures no duplicate active rules for same tenant, pattern, and category';
