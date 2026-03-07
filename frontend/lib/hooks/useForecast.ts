"use client";

import { useQuery } from "@tanstack/react-query";
import { getForecastCurrent, type ForecastResult } from "@/lib/api/forecast";

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
    staleTime = 2 * 60_000, // 2 minutes - forecast changes less frequently
    refetchInterval = 5 * 60_000, // 5 minutes
  } = options;

  return useQuery<ForecastResult, Error>({
    queryKey: ["forecast", "current", tenantId],
    queryFn: () => {
      if (!tenantId) {
        throw new Error("Tenant ID is required");
      }
      return getForecastCurrent(tenantId);
    },
    enabled: enabled && !!tenantId,
    staleTime,
    gcTime: 10 * 60_000, // 10 minutes
    refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
