-- ============================================================
-- Migration 003: Tadfuq — Deterministic Insights Engine
-- ============================================================
-- RULE: This schema feeds ONLY the deterministic Insights Engine.
--       Do NOT connect these tables to the RAG subsystem.
--       Forecast data lives here; LLM/RAG must never read it.
-- ============================================================

-- ------------------------------------------------------------
-- Bank Transactions  (actual cash movements, tenant-scoped)
-- ------------------------------------------------------------
CREATE TYPE txn_type AS ENUM ('CREDIT', 'DEBIT');

CREATE TABLE IF NOT EXISTS bank_transactions (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID         NOT NULL REFERENCES rag_tenants(id) ON DELETE CASCADE,
    txn_date       DATE         NOT NULL,
    amount         NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    txn_type       txn_type     NOT NULL,   -- CREDIT = inflow, DEBIT = outflow
    description    TEXT         NOT NULL DEFAULT '',
    category       VARCHAR(100) NOT NULL DEFAULT 'uncategorized',
    balance_after  NUMERIC(18,2) NOT NULL,  -- running balance after this txn
    reference      VARCHAR(255),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bank_transactions_tenant_date_idx
    ON bank_transactions (tenant_id, txn_date DESC);

CREATE INDEX IF NOT EXISTS bank_transactions_tenant_type_idx
    ON bank_transactions (tenant_id, txn_type, txn_date DESC);

CREATE INDEX IF NOT EXISTS bank_transactions_category_idx
    ON bank_transactions (tenant_id, category);

-- ------------------------------------------------------------
-- 13-Week Cash Flow Forecast  (one row per week, tenant-scoped)
-- Each forecast_run_id groups one complete 13-week set.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forecast_entries (
    id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                UUID         NOT NULL REFERENCES rag_tenants(id) ON DELETE CASCADE,
    forecast_run_id          UUID         NOT NULL,  -- groups a 13-week run together
    week_number              SMALLINT     NOT NULL CHECK (week_number BETWEEN 1 AND 13),
    week_start_date          DATE         NOT NULL,
    forecasted_inflow        NUMERIC(18,2) NOT NULL DEFAULT 0,
    forecasted_outflow       NUMERIC(18,2) NOT NULL DEFAULT 0,
    forecasted_net           NUMERIC(18,2) GENERATED ALWAYS AS (forecasted_inflow - forecasted_outflow) STORED,
    forecasted_ending_balance NUMERIC(18,2) NOT NULL,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, forecast_run_id, week_number)
);

-- Fetch the latest forecast run for a tenant
CREATE INDEX IF NOT EXISTS forecast_entries_tenant_run_idx
    ON forecast_entries (tenant_id, forecast_run_id, week_number);

CREATE INDEX IF NOT EXISTS forecast_entries_latest_idx
    ON forecast_entries (tenant_id, created_at DESC);

-- ------------------------------------------------------------
-- Alerts  (active system alerts, tenant-scoped)
-- The insights engine reads existing alerts as additional signal.
-- ------------------------------------------------------------
CREATE TYPE alert_severity AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

CREATE TABLE IF NOT EXISTS alerts (
    id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID           NOT NULL REFERENCES rag_tenants(id) ON DELETE CASCADE,
    alert_type   VARCHAR(100)   NOT NULL,   -- e.g. "LOW_BALANCE", "PAYMENT_FAILED"
    severity     alert_severity NOT NULL,
    title        VARCHAR(500)   NOT NULL,
    message      TEXT           NOT NULL,
    details      JSONB          NOT NULL DEFAULT '{}',
    triggered_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    resolved_at  TIMESTAMPTZ,
    is_active    BOOLEAN        NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS alerts_tenant_active_idx
    ON alerts (tenant_id, is_active, triggered_at DESC);

CREATE INDEX IF NOT EXISTS alerts_tenant_type_idx
    ON alerts (tenant_id, alert_type);
