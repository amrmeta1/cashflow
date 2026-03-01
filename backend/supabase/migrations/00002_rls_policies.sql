-- =============================================================================
-- Tadfuq.ai — Row Level Security (RLS)
-- Users can only see/update data where tenant_id = their JWT tenant_id
-- Set tenant_id in JWT (e.g. app_metadata.tenant_id or custom claim) when user logs in
-- =============================================================================

-- Returns current user's tenant_id from JWT for RLS
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'tenant_id')::uuid,
    ((auth.jwt() -> 'app_metadata') ->> 'tenant_id')::uuid
  );
$$;

COMMENT ON FUNCTION public.current_tenant_id() IS 'tenant_id from JWT for RLS';

-- Enable RLS on all tenant-scoped tables
ALTER TABLE public.tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_positions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- TENANTS: select own tenant
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT
  USING (id = public.current_tenant_id());
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE
  USING (owner_id = auth.uid());

-- USERS: select in same tenant
CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "users_update" ON public.users FOR UPDATE
  USING (tenant_id = public.current_tenant_id());

-- MEMBERSHIPS
CREATE POLICY "memberships_select" ON public.memberships FOR SELECT
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "memberships_insert" ON public.memberships FOR INSERT
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "memberships_update" ON public.memberships FOR UPDATE
  USING (tenant_id = public.current_tenant_id());

-- bank_accounts, transactions, projects, invoices, forecasts, alerts, entities, cash_positions, audit_logs
CREATE POLICY "bank_accounts_select" ON public.bank_accounts FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "bank_accounts_insert" ON public.bank_accounts FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "bank_accounts_update" ON public.bank_accounts FOR UPDATE USING (tenant_id = public.current_tenant_id());
CREATE POLICY "bank_accounts_delete" ON public.bank_accounts FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (tenant_id = public.current_tenant_id());
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (tenant_id = public.current_tenant_id());
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE USING (tenant_id = public.current_tenant_id());
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "forecasts_select" ON public.forecasts FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "forecasts_insert" ON public.forecasts FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "forecasts_update" ON public.forecasts FOR UPDATE USING (tenant_id = public.current_tenant_id());
CREATE POLICY "forecasts_delete" ON public.forecasts FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "alerts_select" ON public.alerts FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "alerts_insert" ON public.alerts FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "alerts_update" ON public.alerts FOR UPDATE USING (tenant_id = public.current_tenant_id());
CREATE POLICY "alerts_delete" ON public.alerts FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "entities_select" ON public.entities FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "entities_insert" ON public.entities FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "entities_update" ON public.entities FOR UPDATE USING (tenant_id = public.current_tenant_id());
CREATE POLICY "entities_delete" ON public.entities FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "cash_positions_select" ON public.cash_positions FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "cash_positions_insert" ON public.cash_positions FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "cash_positions_update" ON public.cash_positions FOR UPDATE USING (tenant_id = public.current_tenant_id());
CREATE POLICY "cash_positions_delete" ON public.cash_positions FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
