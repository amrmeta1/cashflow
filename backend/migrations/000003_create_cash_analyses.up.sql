CREATE TABLE cash_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    health_score INTEGER,
    risk_level VARCHAR(20),
    runway_days INTEGER,
    analysis_data JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    transaction_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_analyses_tenant_id ON cash_analyses(tenant_id);
CREATE INDEX idx_cash_analyses_analyzed_at ON cash_analyses(analyzed_at DESC);
