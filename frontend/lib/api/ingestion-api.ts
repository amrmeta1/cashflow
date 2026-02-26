import { ingestionApi } from "./client";
import type {
  ApiListResponse,
  BankTransaction,
  BankAccount,
  CreateBankAccountInput,
  CSVImportResult,
  CashPositionResponse,
  TransactionFilters,
} from "./types";

export async function importBankCSV(
  tenantId: string,
  file: File,
  accountId: string
): Promise<CSVImportResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("account_id", accountId);
  return ingestionApi.post(`/tenants/${tenantId}/imports/bank-csv`, form);
}

export async function listTransactions(
  tenantId: string,
  filters?: TransactionFilters
): Promise<ApiListResponse<BankTransaction>> {
  const params: Record<string, string> = {};
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.accountId) params.accountId = filters.accountId;
  if (filters?.limit) params.limit = String(filters.limit);
  if (filters?.offset) params.offset = String(filters.offset);
  return ingestionApi.get(`/tenants/${tenantId}/transactions`, params);
}

export async function createBankAccount(
  tenantId: string,
  input: CreateBankAccountInput
): Promise<BankAccount> {
  return ingestionApi.post(`/tenants/${tenantId}/bank-accounts`, input);
}

export async function getCashPosition(
  tenantId: string,
  asOf?: string
): Promise<CashPositionResponse> {
  const params: Record<string, string> = {};
  if (asOf) params.asOf = asOf;
  return ingestionApi.get(`/tenants/${tenantId}/cash-position`, params);
}
