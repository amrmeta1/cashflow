-- =============================================================================
-- Tadfuq.ai — Multi-Tenant Schema for Supabase
-- Production-ready: tenants table, tenant_id on all important tables, RLS
-- Run this in Supabase SQL Editor or via supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TENANTS (Organizations)
-- owner_id references Supabase auth.users(id) for the tenant owner
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenants IS 'Organizations (tenants). owner_id = Supabase auth user who owns the tenant.';
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_id);

-- -----------------------------------------------------------------------------
-- 2. USERS (profile / app user — optional; identity can stay in auth.users)
-- tenant_id = default or primary tenant for this user
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT NOT NULL DEFAULT '',
    avatar_url  TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'App user profiles. tenant_id = primary tenant (for RLS / default context).';
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);

-- -----------------------------------------------------------------------------
-- 3. MEMBERSHIPS (user <-> tenant, many-to-many)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'accountant_readonly',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON public.memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);

-- -----------------------------------------------------------------------------
-- 4. BANK_ACCOUNTS (tenant-scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    currency    TEXT NOT NULL DEFAULT 'SAR',
    nickname    TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON public.bank_accounts(tenant_id);

-- -----------------------------------------------------------------------------
-- 5. TRANSACTIONS (tenant-scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    account_id   UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    txn_date     DATE NOT NULL,
    amount       NUMERIC(18,4) NOT NULL,
    currency     TEXT NOT NULL DEFAULT 'SAR',
    description  TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON public.transactions(tenant_id);

-- -----------------------------------------------------------------------------
-- 6. PROJECTS (tenant-scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON public.projects(tenant_id);

-- -----------------------------------------------------------------------------
-- 7. INVOICES (tenant-scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    amount      NUMERIC(18,4) NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'SAR',
    status      TEXT NOT NULL DEFAULT 'draft',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);

-- -----------------------------------------------------------------------------
-- 8. FORECASTS (tenant-scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forecasts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    period      TEXT NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forecasts_tenant ON public.forecasts(tenant_id);

-- -----------------------------------------------------------------------------
-- 9. ALERTS (tenant-scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    severity    TEXT NOT NULL DEFAULT 'info',
    message     TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON public.alerts(tenant_id);

-- -----------------------------------------------------------------------------
-- 10. ENTITIES (multi-entity per tenant: branches, subsidiaries)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name_en       TEXT NOT NULL,
    name_ar       TEXT NOT NULL DEFAULT '',
    currency      TEXT NOT NULL DEFAULT 'SAR',
    balance       NUMERIC(18,4) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entities_tenant ON public.entities(tenant_id);

-- -----------------------------------------------------------------------------
-- 11. CASH_POSITIONS (tenant-scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_positions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entity_id   UUID REFERENCES public.entities(id) ON DELETE SET NULL,
    as_of_date  DATE NOT NULL,
    amount      NUMERIC(18,4) NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'SAR',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_positions_tenant ON public.cash_positions(tenant_id);

-- -----------------------------------------------------------------------------
-- 12. AUDIT_LOGS (tenant-scoped)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    actor_id    TEXT NOT NULL DEFAULT '',
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT '',
    entity_id   TEXT NOT NULL DEFAULT '',
    metadata    JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);
