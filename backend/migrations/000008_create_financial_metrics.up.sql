-- Financial metrics time-series table
-- Stores calculated metrics like burn_rate, runway_days, revenue_growth, etc.
-- Enables historical tracking and trend analysis

CREATE TABLE financial_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC(18,4) NOT NULL,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for efficient querying
CREATE INDEX idx_financial_metrics_tenant ON financial_metrics(tenant_id);
CREATE INDEX idx_financial_metrics_name ON financial_metrics(metric_name);
CREATE INDEX idx_financial_metrics_created ON financial_metrics(created_at DESC);
CREATE INDEX idx_financial_metrics_tenant_name ON financial_metrics(tenant_id, metric_name);
CREATE INDEX idx_financial_metrics_period ON financial_metrics(period_start, period_end);

-- Add table comment
COMMENT ON TABLE financial_metrics IS 
'Time-series storage for calculated financial metrics (burn_rate, runway_days, revenue_growth, expense_ratio, liquidity_buffer, collection_score, etc.)';

COMMENT ON COLUMN financial_metrics.metric_name IS 
'Metric identifier (e.g., burn_rate, runway_days, revenue_growth)';

COMMENT ON COLUMN financial_metrics.metadata IS 
'Additional context: calculation method, data sources, confidence scores, etc.';
