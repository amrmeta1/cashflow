// ── Shared ────────────────────────────────────────────────────
export interface Meta {
  total: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: Meta;
}

export interface ApiError {
  error: string;
}

// ── Tenant Service Models ─────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: "active" | "suspended" | "deleted";
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  plan?: string;
  metadata?: Record<string, unknown>;
}

export interface User {
  id: string;
  sub: string;
  email: string;
  full_name: string;
  avatar_url: string;
  status: "active" | "disabled" | "deleted";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Role =
  | "tenant_admin"
  | "owner"
  | "finance_manager"
  | "accountant_readonly"
  | "group_cfo"
  | "treasury_director"
  | "financial_controller"
  | "ap_manager"
  | "ar_manager"
  | "bank_relationship_manager"
  | "auditor_readonly"
  | "board_member";

export interface Membership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: Role;
  status: "active" | "invited" | "disabled";
  created_at: string;
  updated_at: string;
}

export interface AddMemberInput {
  user_id: string;
  role: Role;
}

export interface ChangeMemberRoleInput {
  membership_id: string;
  role: Role;
}

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  actor_sub: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  occurred_at: string;
}

// ── Ingestion Service Models ──────────────────────────────────
export interface BankTransaction {
  id: string;
  tenant_id: string;
  account_id: string;
  txn_date: string;
  amount: number;
  currency: string;
  description: string;
  counterparty: string;
  category: string;
  hash: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  tenant_id: string;
  provider: string;
  external_id: string;
  currency: string;
  nickname: string;
  status: "active" | "inactive" | "error";
  created_at: string;
  updated_at: string;
}

export interface CreateBankAccountInput {
  provider?: string;
  external_id?: string;
  currency?: string;
  nickname: string;
}

export interface CSVImportResult {
  data: {
    job_id: string;
    total_rows: number;
    inserted: number;
    duplicates: number;
    errors: number;
    error_detail: string[];
  };
}

export interface TransactionFilters {
  from?: string;
  to?: string;
  accountId?: string;
  limit?: number;
  offset?: number;
}

// ── Cash Position (ingestion) ──────────────────────────────────
export interface CashPositionAccount {
  accountId: string;
  name: string;
  currency: string;
  balance: number;
}

export interface CashPositionTotalByCurrency {
  currency: string;
  balance: number;
}

export interface CashPositionTotals {
  byCurrency: CashPositionTotalByCurrency[];
}

export interface CashPositionResponse {
  tenantId: string;
  asOf: string;
  currencyMode: "native";
  accounts: CashPositionAccount[];
  totals: CashPositionTotals;
}
