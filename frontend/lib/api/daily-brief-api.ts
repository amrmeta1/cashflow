// Daily Treasury Brief API
import { tenantApi } from './client';

export interface DailyBriefData {
  date: string;
  summary: string;
  cash_position?: number;
  runway_days?: number;
  daily_burn_rate?: number;
  inflows_30d?: number;
  outflows_30d?: number;
  top_risk?: string;
  top_opportunity?: string;
  recommended_action?: string;
  confidence?: number;
  dataQuality?: number;
  lastUpdated: string;
  risks?: Array<{ id: string; textEn: string; textAr: string }>;
  opportunities?: Array<{ id: string; textEn: string; textAr: string }>;
  recommendations?: Array<{ id: string; textEn: string; textAr: string }>;
}

/**
 * Get daily treasury brief for a tenant
 * @param tenantId - Tenant UUID
 * @param date - Optional date (defaults to today)
 */
export async function getDailyBrief(
  tenantId: string,
  date?: string
): Promise<DailyBriefData> {
  try {
    // Try the dedicated daily-brief endpoint
    const endpoint = date
      ? `/api/v1/tenants/${tenantId}/daily-brief?date=${date}`
      : `/api/v1/tenants/${tenantId}/daily-brief`;
    
    const response = await tenantApi.get(endpoint);
    return response as DailyBriefData;
  } catch (error) {
    // Fallback to insights endpoint if daily-brief not available
    console.warn('Daily brief endpoint not available, trying insights fallback:', error);
    try {
      const insights = await tenantApi.get(`/api/v1/tenants/${tenantId}/insights`);
      
      // Transform insights response to DailyBriefData format
      return {
        date: new Date().toISOString(),
        summary: 'Treasury insights summary',
        lastUpdated: new Date().toISOString(),
        confidence: 0,
        dataQuality: 0,
        risks: Array.isArray(insights) 
          ? insights.filter((i: any) => i.type === 'risk').map((i: any) => ({
              id: i.id,
              textEn: i.title,
              textAr: i.titleAr || i.title
            }))
          : [],
        opportunities: Array.isArray(insights)
          ? insights.filter((i: any) => i.type === 'opportunity').map((i: any) => ({
              id: i.id,
              textEn: i.title,
              textAr: i.titleAr || i.title
            }))
          : [],
        recommendations: Array.isArray(insights)
          ? insights.filter((i: any) => i.type === 'recommendation').map((i: any) => ({
              id: i.id,
              textEn: i.title,
              textAr: i.titleAr || i.title
            }))
          : [],
      };
    } catch (fallbackError) {
      // Return empty brief if both endpoints fail
      console.warn('Both daily-brief and insights endpoints failed:', fallbackError);
      return {
        date: new Date().toISOString(),
        summary: 'Daily brief data not available yet',
        lastUpdated: new Date().toISOString(),
        confidence: 0,
        dataQuality: 0,
        risks: [],
        opportunities: [],
        recommendations: [],
      };
    }
  }
}
