// Consolidated Liquidity API - combines forecast, cash-story, actions, daily-brief
import { tenantApi } from './client';

export interface ForecastResult {
  forecast: any;
  confidence: number;
  generated_at: string;
  metrics?: {
    current_cash?: number;
    [key: string]: any;
  };
}

export interface TreasuryAction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'dismissed';
  created_at: string;
  category: string;
  impact: number;
  confidence?: number;
  effort_level?: 'high' | 'medium' | 'low';
  type?: string;
}

export interface CashDriver {
  type: string;
  description: string;
  impact: number;
  risk_level?: string;
  [key: string]: any;
}

export interface DailyBriefData {
  date: string;
  summary: string;
  risks?: any[];
  opportunities?: any[];
  recommendations?: any[];
  [key: string]: any;
}

export interface ActionsData {
  actions: TreasuryAction[];
}

// Forecast APIs
export async function getForecast(tenantId: string): Promise<any> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/liquidity/forecast`);
}

export async function getForecastCurrent(tenantId: string): Promise<ForecastResult> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/forecast/current`);
}

export async function refreshForecast(tenantId: string): Promise<any> {
  return tenantApi.post(`/api/v1/tenants/${tenantId}/liquidity/forecast/refresh`);
}

// Cash Story APIs
export async function getCashStory(tenantId: string): Promise<any> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/liquidity/cash-story`);
}

// Recommended Actions APIs
export async function getRecommendedActions(tenantId: string): Promise<any[]> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/liquidity/decisions`);
}

export async function fetchRecommendedActions(tenantId: string): Promise<any[]> {
  return getRecommendedActions(tenantId);
}

// Daily Brief APIs
export async function getDailyBrief(tenantId: string, date?: string): Promise<any> {
  // Try insights endpoint from rag-service as fallback for daily brief
  try {
    return tenantApi.get(`/api/v1/tenants/${tenantId}/insights`);
  } catch (error) {
    console.warn('Daily brief endpoint not available, using mock data');
    return {
      date: new Date().toISOString(),
      summary: 'Daily brief data not available yet',
      confidence: 0,
      dataQuality: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function refreshDailyBrief(tenantId: string): Promise<any> {
  return tenantApi.post(`/api/v1/tenants/${tenantId}/liquidity/daily-brief/refresh`);
}
