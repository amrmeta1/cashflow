-- Create vendor_rules table for learning vendor/category mappings from user corrections

CREATE TABLE vendor_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL,
    normalized_pattern TEXT NOT NULL,
    vendor_name TEXT,
    category TEXT,
    confidence NUMERIC(5,2) DEFAULT 1.0,
    source TEXT DEFAULT 'user_correction',
    times_applied INTEGER DEFAULT 0,
    times_confirmed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tenant-scoped queries with status filter
CREATE INDEX idx_vendor_rules_tenant_status ON vendor_rules(tenant_id, status);

-- Index for pattern matching queries
CREATE INDEX idx_vendor_rules_tenant_pattern ON vendor_rules(tenant_id, normalized_pattern);

-- Add table comment for documentation
COMMENT ON TABLE vendor_rules IS 'Learned vendor/category mappings from user corrections. Used to auto-fill transactions in future imports.';
COMMENT ON COLUMN vendor_rules.pattern IS 'Original pattern text as provided by user';
COMMENT ON COLUMN vendor_rules.normalized_pattern IS 'Lowercase, trimmed, space-collapsed version for matching';
COMMENT ON COLUMN vendor_rules.times_applied IS 'Number of times this rule was applied to a transaction';
COMMENT ON COLUMN vendor_rules.times_confirmed IS 'Number of times user accepted the rule without editing';
