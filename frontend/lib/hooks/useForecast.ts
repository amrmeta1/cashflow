"use client";

import { useQuery } from "@tanstack/react-query";
import { getCashForecast, type CashForecastData } from "@/lib/api/cash-forecast-api";

interface UseForecastOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}

/**
 * React Query hook to fetch 13-week cash forecast for a tenant.
 * Provides automatic caching, background refetching, and optimistic updates.
 */
export function useForecast(
  tenantId: string | null,
  options: UseForecastOptions = {}
) {
  const {
    enabled = true,
    staleTime = 30_000, // 30 seconds
    refetchInterval = 60_000, // 60 seconds auto-refresh
  } = options;

  return useQuery<CashForecastData, Error>({
    queryKey: ["forecast", tenantId],
    queryFn: () => {
      if (!tenantId) {
        return Promise.resolve({
          forecast: [],
          metrics: {
            current_cash: 0,
            avg_weekly_inflow: 0,
            avg_weekly_outflow: 0,
            avg_weekly_burn: 0,
            runway_weeks: 0,
          },
          confidence: 0,
          generated_at: new Date().toISOString(),
        });
      }
      return getCashForecast(tenantId);
    },
    enabled: enabled && !!tenantId,
    staleTime,
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
