// Cash Flow DNA API - Pattern detection and vendor intelligence
import { tenantApi } from './client';

export interface CashFlowPattern {
  id: string;
  pattern_type: 'recurring_vendor' | 'payroll' | 'subscription' | 'burn_rate';
  vendor_id?: string;
  vendor_name?: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  avg_amount: number;
  amount_variance?: number;
  confidence: number;
  occurrence_count: number;
  last_detected: string;
  next_expected?: string;
  metadata?: {
    intervals_days?: number[];
    last_amounts?: number[];
    description_keywords?: string[];
    components?: {
      payroll?: number;
      subscriptions?: number;
      vendors?: number;
    };
    monthly_burn?: number;
    amount_consistency?: number;
  };
}

export interface CashFlowPatternsResponse {
  tenant_id: string;
  patterns: CashFlowPattern[];
  count: number;
}

export interface VendorStats {
  vendor_id: string;
  vendor_name: string;
  total_spend: number;
  total_inflow: number;
  total_outflow: number;
  transaction_count: number;
  inflow_count: number;
  outflow_count: number;
  avg_transaction: number;
  avg_inflow: number;
  avg_outflow: number;
  last_transaction_at?: string;
}

export interface TopVendorsResponse {
  tenant_id: string;
  vendors: VendorStats[];
  count: number;
}

/**
 * Get detected cash flow patterns for a tenant
 * @param tenantId - Tenant UUID
 * @param minConfidence - Minimum confidence score (0-100), default 60
 */
export async function getCashFlowPatterns(
  tenantId: string,
  minConfidence: number = 60
): Promise<CashFlowPatternsResponse> {
  try {
    const response = await tenantApi.get(
      `/api/v1/tenants/${tenantId}/cashflow/patterns?min_confidence=${minConfidence}`
    );
    return response as CashFlowPatternsResponse;
  } catch (error) {
    console.warn('Cash flow patterns not available:', error);
    return {
      tenant_id: tenantId,
      patterns: [],
      count: 0,
    };
  }
}

/**
 * Get top vendors by spend for a tenant
 * @param tenantId - Tenant UUID
 * @param limit - Number of vendors to return, default 5
 */
export async function getTopVendors(
  tenantId: string,
  limit: number = 5
): Promise<TopVendorsResponse> {
  try {
    const response = await tenantApi.get(
      `/api/v1/tenants/${tenantId}/vendors/top?limit=${limit}`
    );
    return response as TopVendorsResponse;
  } catch (error) {
    console.warn('Top vendors not available:', error);
    return {
      tenant_id: tenantId,
      vendors: [],
      count: 0,
    };
  }
}

/**
 * Manually trigger pattern analysis for a tenant
 * @param tenantId - Tenant UUID
 */
export async function triggerPatternAnalysis(tenantId: string): Promise<any> {
  return tenantApi.post(`/api/v1/tenants/${tenantId}/cashflow/analyze`);
}
