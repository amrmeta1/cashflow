// Cash Story API
import { tenantApi } from './client';

export interface CashDriver {
  type: 'inflow' | 'outflow';
  name: string;
  description: string;
  impact: number;
  risk_level?: string;
  [key: string]: any;
}

export interface CashStoryData {
  summary: string;
  cash_change: number;
  total_inflows: number;
  total_outflows: number;
  drivers: CashDriver[];
  risk_level: string;
  confidence: number;
  generated_at: string;
}

/**
 * Get AI-generated cash story for a tenant
 * @param tenantId - Tenant UUID
 */
export async function getCashStory(tenantId: string): Promise<CashStoryData> {
  const response = await tenantApi.get(`/api/v1/tenants/${tenantId}/liquidity/cash-story`);
  return response as CashStoryData;
}
