// Operations API - ingestion and operations management
import { ingestionApi, tenantApi } from './client';

export interface IngestionJob {
  id: string;
  tenant_id: string;
  job_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  errors: number;
  job_id?: string;
  total_rows?: number;
}

export interface ImportTransaction {
  date: string;
  amount: number;
  currency: string;
  description: string;
  counterparty: string;
  category: string;
  raw_text: string;
  ai_vendor: string;
  ai_confidence: number;
}

export interface ImportBankJSONPayload {
  account_id: string;
  transactions: ImportTransaction[];
}

// CSV Import
export async function importBankCSV(
  tenantId: string,
  accountId: string,
  file: File
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('account_id', accountId);

  return ingestionApi.post(`/tenants/${tenantId}/imports/bank-csv`, formData);
}

// JSON Import (structured data after AI review)
export async function importBankJSON(
  tenantId: string,
  payload: ImportBankJSONPayload
): Promise<ImportResult> {
  return tenantApi.post(`/api/v1/tenants/${tenantId}/imports/bank-json`, payload);
}

// Sync Jobs
export async function syncBank(tenantId: string): Promise<IngestionJob> {
  return ingestionApi.post(`/tenants/${tenantId}/sync/bank`);
}

export async function syncAccounting(tenantId: string): Promise<IngestionJob> {
  return ingestionApi.post(`/tenants/${tenantId}/sync/accounting`);
}

export async function runAnalysis(tenantId: string): Promise<void> {
  await ingestionApi.post(`/tenants/${tenantId}/analysis/run`);
}

export async function getAnalysisLatest(tenantId: string): Promise<any> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/analysis/latest`);
}

export async function getCashPosition(tenantId: string): Promise<any> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/cash-position`);
}

// Bank Accounts
export interface BankAccount {
  id: string;
  nickname: string;
  currency: string;
  provider: string;
  balance?: number;
}

export async function getBankAccounts(tenantId: string): Promise<BankAccount[]> {
  const response = await tenantApi.get(`/api/v1/tenants/${tenantId}/bank-accounts`);
  return response as BankAccount[];
}

// Vendor Rules
export interface VendorRule {
  id: string;
  tenant_id: string;
  pattern: string;
  normalized_pattern: string;
  vendor_name: string;
  category: string;
  confidence: number;
  source: string;
  times_applied: number;
  times_confirmed: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorRuleInput {
  pattern: string;
  vendor_name: string;
  category: string;
}

export async function createVendorRule(
  tenantId: string,
  input: CreateVendorRuleInput
): Promise<VendorRule> {
  const response = await tenantApi.post(`/api/v1/tenants/${tenantId}/vendor-rules`, input);
  return response as VendorRule;
}

export async function getVendorRules(tenantId: string, status?: string): Promise<VendorRule[]> {
  const params = status ? `?status=${status}` : '';
  const response = await tenantApi.get(`/api/v1/tenants/${tenantId}/vendor-rules${params}`);
  return response as VendorRule[];
}
