"use client";

import { useQuery } from "@tanstack/react-query";
import { getInsights, type InsightsData } from "@/lib/api/insights-api";

interface UseInsightsOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}

/**
 * React Query hook to fetch treasury insights for a tenant.
 * Provides automatic caching, background refetching, and error handling.
 */
export function useInsights(
  tenantId: string | null,
  options: UseInsightsOptions = {}
) {
  const {
    enabled = true,
    staleTime = 30_000, // 30 seconds
    refetchInterval = 60_000, // 60 seconds auto-refresh
  } = options;

  return useQuery<InsightsData, Error>({
    queryKey: ["insights", tenantId],
    queryFn: () => {
      if (!tenantId) {
        return Promise.resolve({
          risks: [],
          opportunities: [],
          recommendations: [],
        });
      }
      return getInsights(tenantId);
    },
    enabled: enabled && !!tenantId,
    staleTime,
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
