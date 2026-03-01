-- CashFlow.ai: Financial Ingestion Service Schema
-- Phase 2: Bank transactions, accounting data, ingestion jobs
-- Managed by golang-migrate

-- ============================================================
-- BANK ACCOUNTS
-- ============================================================
CREATE TABLE bank_accounts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider    TEXT NOT NULL DEFAULT 'manual',          -- e.g. 'lean', 'tarabut', 'manual'
    external_id TEXT NOT NULL DEFAULT '',                -- provider-side account ID
    currency    TEXT NOT NULL DEFAULT 'SAR',
    nickname    TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_accounts_tenant ON bank_accounts(tenant_id);
CREATE UNIQUE INDEX idx_bank_accounts_tenant_provider_ext ON bank_accounts(tenant_id, provider, external_id)
    WHERE external_id != '';

-- ============================================================
-- RAW BANK TRANSACTIONS (immutable audit trail)
-- ============================================================
CREATE TABLE raw_bank_transactions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source      TEXT NOT NULL DEFAULT 'csv',             -- 'csv', 'lean', 'tarabut', etc.
    raw_payload JSONB NOT NULL DEFAULT '{}',
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_bank_txn_tenant ON raw_bank_transactions(tenant_id);
CREATE INDEX idx_raw_bank_txn_imported ON raw_bank_transactions(imported_at);

-- ============================================================
-- BANK TRANSACTIONS (normalized + deduplicated)
-- ============================================================
CREATE TABLE bank_transactions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id   UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    txn_date     DATE NOT NULL,
    amount       NUMERIC(18,4) NOT NULL,
    currency     TEXT NOT NULL DEFAULT 'SAR',
    description  TEXT NOT NULL DEFAULT '',
    counterparty TEXT NOT NULL DEFAULT '',
    category     TEXT NOT NULL DEFAULT 'uncategorized',
    hash         TEXT NOT NULL,                          -- deterministic dedup hash
    raw_id       UUID REFERENCES raw_bank_transactions(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_txn_tenant ON bank_transactions(tenant_id);
CREATE INDEX idx_bank_txn_account ON bank_transactions(account_id);
CREATE INDEX idx_bank_txn_date ON bank_transactions(txn_date);
CREATE UNIQUE INDEX idx_bank_txn_dedup ON bank_transactions(tenant_id, hash);

-- ============================================================
-- INGESTION JOBS
-- ============================================================
CREATE TABLE ingestion_jobs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_type     TEXT NOT NULL,                          -- 'csv_import', 'sync_bank', 'sync_accounting'
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    metadata     JSONB NOT NULL DEFAULT '{}',
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at   TIMESTAMPTZ,
    finished_at  TIMESTAMPTZ,
    error        TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_jobs_tenant ON ingestion_jobs(tenant_id);
CREATE INDEX idx_ingestion_jobs_status ON ingestion_jobs(status);

-- ============================================================
-- IDEMPOTENCY KEYS
-- ============================================================
CREATE TABLE idempotency_keys (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key        TEXT NOT NULL,
    scope      TEXT NOT NULL DEFAULT '',                 -- e.g. 'transactions.ingested', 'ingestion.sync_bank'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_idempotency_tenant_key_scope ON idempotency_keys(tenant_id, key, scope);
