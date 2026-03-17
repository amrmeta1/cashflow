// Treasury Insights API
import { tenantApi } from './client';

export interface Insight {
  id: string;
  type: string;
  title: string;
  titleAr?: string;
  description: string;
  confidence: number;
  impact?: number;
  created_at: string;
}

export interface InsightsData {
  risks: Insight[];
  opportunities: Insight[];
  recommendations: Insight[];
}

/**
 * Get treasury insights for a tenant
 * @param tenantId - Tenant UUID
 */
export async function getInsights(tenantId: string): Promise<InsightsData> {
  try {
    // Try RAG service insights endpoint first
    const response = await tenantApi.get(`/api/v1/tenants/${tenantId}/insights`);
    
    // If backend returns array, transform to categorized structure
    if (Array.isArray(response)) {
      return {
        risks: response.filter((i: Insight) => i.type === 'risk'),
        opportunities: response.filter((i: Insight) => i.type === 'opportunity'),
        recommendations: response.filter((i: Insight) => i.type === 'recommendation'),
      };
    }
    
    // If backend already returns categorized structure
    return response as InsightsData;
  } catch (error) {
    // If insights endpoint not available, return empty data
    console.warn('Insights endpoint not available yet:', error);
    return {
      risks: [],
      opportunities: [],
      recommendations: [],
    };
  }
}
