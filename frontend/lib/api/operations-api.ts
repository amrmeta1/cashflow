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
  console.log('📤 importBankCSV called:', { tenantId, accountId, fileName: file.name, fileSize: file.size });
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('account_id', accountId);
  
  console.log('FormData created with file and account_id');
  console.log('Endpoint:', `/tenants/${tenantId}/imports/bank-csv`);

  const result = await ingestionApi.post(`/tenants/${tenantId}/imports/bank-csv`, formData) as ImportResult;
  console.log('📥 importBankCSV response:', result);
  return result;
}

// JSON Import (structured data after AI review)
export async function importBankJSON(
  tenantId: string,
  payload: ImportBankJSONPayload
): Promise<ImportResult> {
  console.log('📤 importBankJSON called:', { 
    tenantId, 
    accountId: payload.account_id, 
    transactionCount: payload.transactions.length 
  });
  console.log('Endpoint:', `/api/v1/tenants/${tenantId}/imports/bank-json`);
  
  const result = await tenantApi.post(`/api/v1/tenants/${tenantId}/imports/bank-json`, payload) as ImportResult;
  console.log('📥 importBankJSON response:', result);
  return result;
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

interface AnalysisResponse {
  transaction_count?: number;
  summary?: {
    health_score?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function getAnalysisLatest(tenantId: string): Promise<AnalysisResponse> {
  console.log('📤 getAnalysisLatest called:', { tenantId });
  console.log('Endpoint:', `/api/v1/tenants/${tenantId}/analysis/latest`);
  
  const result = await tenantApi.get(`/api/v1/tenants/${tenantId}/analysis/latest`) as AnalysisResponse;
  
  console.log('📥 getAnalysisLatest response:', {
    hasData: !!result,
    transactionCount: result?.transaction_count,
    healthScore: result?.summary?.health_score
  });
  
  return result;
}

export async function getCashPosition(tenantId: string, asOf?: string): Promise<any> {
  const params: Record<string, string> | undefined = asOf ? { asOf } : undefined;
  return tenantApi.get(`/api/v1/tenants/${tenantId}/cash-position`, params);
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
  const response = await tenantApi.get(`/api/v1/tenants/${tenantId}/bank-accounts`) as any;
  // Backend returns { accounts: [...], total: N }, extract the accounts array
  return Array.isArray(response) ? response : (response?.accounts || []);
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
