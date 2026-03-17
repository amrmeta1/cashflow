-- Agent signals table for storing detected financial signals
-- Phase A: Deterministic signal detection (no LLM)

CREATE TABLE agent_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title TEXT NOT NULL,
    description TEXT,
    data JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_agent_signals_tenant ON agent_signals(tenant_id);
CREATE INDEX idx_agent_signals_created ON agent_signals(created_at DESC);
CREATE INDEX idx_agent_signals_status ON agent_signals(status);
CREATE INDEX idx_agent_signals_severity ON agent_signals(severity);
CREATE INDEX idx_agent_signals_tenant_status ON agent_signals(tenant_id, status);

-- Table and column comments
COMMENT ON TABLE agent_signals IS 
'Deterministic financial signals detected by the Signal Engine (Phase A)';

COMMENT ON COLUMN agent_signals.signal_type IS 
'Signal identifier: runway_risk, burn_spike, revenue_drop, vendor_concentration, receivable_delay, liquidity_gap';

COMMENT ON COLUMN agent_signals.data IS 
'Signal-specific metadata: thresholds, calculations, supporting data';

COMMENT ON COLUMN agent_signals.status IS 
'Signal lifecycle: active (newly detected), resolved (condition cleared), dismissed (user ignored)';
