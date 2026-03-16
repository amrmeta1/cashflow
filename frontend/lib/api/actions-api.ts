// Treasury Actions API
import { tenantApi } from './client';

export interface TreasuryAction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'dismissed';
  impact: number;
  effort_level?: 'high' | 'medium' | 'low';
  category: string;
  confidence?: number;
  created_at: string;
  type?: string;
}

export interface ActionsData {
  actions: TreasuryAction[];
}

/**
 * Get recommended treasury actions for a tenant
 * @param tenantId - Tenant UUID
 */
export async function getActions(tenantId: string): Promise<ActionsData> {
  // Use the actual backend endpoint: /liquidity/decisions
  const response = await tenantApi.get(`/api/v1/tenants/${tenantId}/liquidity/decisions`);
  
  // If backend returns array, wrap in actions object
  if (Array.isArray(response)) {
    return { actions: response };
  }
  
  // If backend already returns object with actions
  return response as ActionsData;
}
