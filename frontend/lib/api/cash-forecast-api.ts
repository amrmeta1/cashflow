// 13-Week Cash Forecast API
import { tenantApi } from './client';

export interface ForecastWeek {
  week: number;
  date: string;
  baseline: number;
  inflows: number;
  outflows: number;
  ending_balance: number;
}

export interface ForecastMetrics {
  current_cash: number;
  avg_weekly_inflow: number;
  avg_weekly_outflow: number;
  avg_weekly_burn: number;
  runway_weeks: number;
  liquidity_gap_week?: number;
}

export interface CashForecastData {
  forecast: ForecastWeek[];
  metrics: ForecastMetrics;
  confidence: number;
  generated_at: string;
}

/**
 * Get 13-week cash forecast for a tenant
 * @param tenantId - Tenant UUID
 */
export async function getCashForecast(tenantId: string): Promise<CashForecastData> {
  const response = await tenantApi.get(`/api/v1/tenants/${tenantId}/liquidity/forecast`);
  return response as CashForecastData;
}
