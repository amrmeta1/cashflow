-- Create vendors table for canonical vendor identities

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    canonical_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    vendor_type TEXT,
    default_category TEXT,
    confidence NUMERIC(5,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tenant-scoped normalized name lookups
CREATE INDEX idx_vendors_tenant_normalized ON vendors(tenant_id, normalized_name);

-- Index for tenant-scoped queries
CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);

-- Add table and column comments
COMMENT ON TABLE vendors IS 'Canonical vendor identities for transaction resolution';
COMMENT ON COLUMN vendors.canonical_name IS 'Human-readable vendor name (e.g., "Uber")';
COMMENT ON COLUMN vendors.normalized_name IS 'Lowercase, trimmed, space-collapsed for matching';
COMMENT ON COLUMN vendors.vendor_type IS 'Optional vendor classification (e.g., "merchant", "utility")';
COMMENT ON COLUMN vendors.default_category IS 'Suggested category for this vendor';
COMMENT ON COLUMN vendors.confidence IS 'Confidence score for vendor identity (0.0-1.0)';
