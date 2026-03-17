-- Create cashflow_patterns table for automatic pattern detection

CREATE TABLE cashflow_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL,  -- 'recurring_vendor', 'payroll', 'subscription', 'burn_rate'
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    frequency TEXT NOT NULL,  -- 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly'
    avg_amount NUMERIC(20,2) NOT NULL,
    amount_variance NUMERIC(5,2),  -- Standard deviation as percentage
    confidence NUMERIC(5,2) NOT NULL,  -- 0-100 score
    occurrence_count INTEGER NOT NULL,
    last_detected TIMESTAMPTZ NOT NULL,
    next_expected TIMESTAMPTZ,  -- Predicted next occurrence
    metadata JSONB,  -- Additional pattern-specific data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one pattern per type/vendor/frequency combination per tenant
CREATE UNIQUE INDEX idx_cashflow_patterns_unique ON cashflow_patterns(tenant_id, pattern_type, COALESCE(vendor_id, '00000000-0000-0000-0000-000000000000'::uuid), frequency);

-- Index for high-confidence pattern queries
CREATE INDEX idx_cashflow_patterns_confidence ON cashflow_patterns(tenant_id, confidence DESC);

-- Index for upcoming predictions
CREATE INDEX idx_cashflow_patterns_next_expected ON cashflow_patterns(tenant_id, next_expected);

-- Index for tenant-scoped queries
CREATE INDEX idx_cashflow_patterns_tenant ON cashflow_patterns(tenant_id);

-- Add table and column comments
COMMENT ON TABLE cashflow_patterns IS 'Automatically detected recurring financial patterns (Cash Flow DNA)';
COMMENT ON COLUMN cashflow_patterns.pattern_type IS 'Type of pattern: recurring_vendor, payroll, subscription, burn_rate';
COMMENT ON COLUMN cashflow_patterns.frequency IS 'Detected frequency: daily, weekly, biweekly, monthly, quarterly';
COMMENT ON COLUMN cashflow_patterns.avg_amount IS 'Average transaction amount for this pattern';
COMMENT ON COLUMN cashflow_patterns.amount_variance IS 'Standard deviation as percentage (0-100)';
COMMENT ON COLUMN cashflow_patterns.confidence IS 'Confidence score 0-100 (regularity 40% + amount 30% + occurrences 30%)';
COMMENT ON COLUMN cashflow_patterns.occurrence_count IS 'Number of transactions matching this pattern';
COMMENT ON COLUMN cashflow_patterns.last_detected IS 'Timestamp when pattern was last detected/updated';
COMMENT ON COLUMN cashflow_patterns.next_expected IS 'Predicted date of next occurrence';
COMMENT ON COLUMN cashflow_patterns.metadata IS 'Additional pattern-specific data (intervals, keywords, components)';
