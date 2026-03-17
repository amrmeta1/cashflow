-- Create vendor_stats table for aggregated vendor spending analytics

CREATE TABLE vendor_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    total_spend NUMERIC(20,2) NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    avg_transaction NUMERIC(20,2) NOT NULL DEFAULT 0,
    last_transaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one stats record per vendor per tenant
CREATE UNIQUE INDEX idx_vendor_stats_tenant_vendor ON vendor_stats(tenant_id, vendor_id);

-- Index for top vendors query (ordered by spend)
CREATE INDEX idx_vendor_stats_tenant_spend ON vendor_stats(tenant_id, total_spend DESC);

-- Index for tenant-scoped queries
CREATE INDEX idx_vendor_stats_tenant ON vendor_stats(tenant_id);

-- Add table and column comments
COMMENT ON TABLE vendor_stats IS 'Aggregated spending statistics per vendor for analytics';
COMMENT ON COLUMN vendor_stats.total_spend IS 'Total amount spent with this vendor';
COMMENT ON COLUMN vendor_stats.transaction_count IS 'Number of transactions with this vendor';
COMMENT ON COLUMN vendor_stats.avg_transaction IS 'Average transaction amount (total_spend / transaction_count)';
COMMENT ON COLUMN vendor_stats.last_transaction_at IS 'Timestamp of most recent transaction with this vendor';
