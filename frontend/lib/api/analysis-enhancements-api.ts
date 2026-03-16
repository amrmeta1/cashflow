// Analysis Enhancements API
import { tenantApi } from './client';

export interface StatementHistoryItem {
  id: string;
  bank_type: string;
  file_name: string;
  imported_at: string;
  transaction_count: number;
  total_amount: number;
  currency: string;
}

export interface DataQualityMetrics {
  overall_score: number;
  total_transactions: number;
  ai_classified: number;
  vendors_identified: number;
  unclassified: number;
  missing_vendors: number;
}

export interface SmartAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  amount?: number;
  previous_amount?: number;
  currency?: string;
  action_label?: string;
  action_label_ar?: string;
  action_url?: string;
}

export interface BankInsight {
  id: string;
  type: 'fee' | 'transaction' | 'recommendation' | 'pattern';
  title: string;
  title_ar: string;
  value: string;
  value_ar: string;
  description?: string;
  description_ar?: string;
  impact?: string;
  impact_ar?: string;
}

// Get statement history
export async function getStatementHistory(tenantId: string): Promise<StatementHistoryItem[]> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/analysis/statement-history`);
}

// Get data quality metrics
export async function getDataQuality(tenantId: string): Promise<DataQualityMetrics> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/analysis/data-quality`);
}

// Get smart alerts
export async function getSmartAlerts(tenantId: string): Promise<SmartAlert[]> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/analysis/smart-alerts`);
}

// Get bank insights
export async function getBankInsights(tenantId: string, bankType: string = 'qnb'): Promise<BankInsight[]> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/analysis/bank-insights?bank_type=${bankType}`);
}
