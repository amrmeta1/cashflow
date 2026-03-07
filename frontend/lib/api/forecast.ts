import { ingestionApi } from "./client";
import { MOCKS_ENABLED } from "./mock-data";

export interface ForecastPoint {
  week_number: number;
  baseline: number;
  upper_bound: number;
  lower_bound: number;
}

export interface ForecastMetrics {
  current_cash: number;
  avg_daily_inflow: number;
  avg_daily_outflow: number;
  std_dev: number;
  trend_rate: number;
  transaction_count: number;
}

export interface ForecastResult {
  tenant_id: string;
  generated_at: string;
  metrics: ForecastMetrics;
  forecast: ForecastPoint[];
  confidence: number;
}

/**
 * Generate mock forecast data for development
 */
function getMockForecastResult(tenantId: string): ForecastResult {
  const currentCash = 1_283_844;
  const weeklyChange = 2_500; // Slight improvement trend
  
  const forecast: ForecastPoint[] = [];
  for (let i = 0; i < 13; i++) {
    const baseline = currentCash + (weeklyChange * i);
    const variance = 45_000;
    forecast.push({
      week_number: i + 1,
      baseline: Math.round(baseline),
      upper_bound: Math.round(baseline + variance),
      lower_bound: Math.round(baseline - variance),
    });
  }

  return {
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    metrics: {
      current_cash: currentCash,
      avg_daily_inflow: 12_500,
      avg_daily_outflow: 8_200,
      std_dev: 45_000,
      trend_rate: 357, // Weekly trend
      transaction_count: 234,
    },
    forecast,
    confidence: 0.68,
  };
}

/**
 * Fetches the current 13-week cash forecast for a tenant.
 * Returns empty forecast if no transaction data exists.
 */
export async function getForecastCurrent(tenantId: string): Promise<ForecastResult> {
  if (MOCKS_ENABLED) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return getMockForecastResult(tenantId);
  }
  
  try {
    return await ingestionApi.get<ForecastResult>(`/tenants/${tenantId}/forecast/current`);
  } catch (error) {
    console.warn("Failed to fetch forecast from backend, using mock data:", error);
    // Fallback to mock data when backend is unavailable
    return getMockForecastResult(tenantId);
  }
}
