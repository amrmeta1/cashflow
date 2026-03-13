"use client";

import { useQuery } from "@tanstack/react-query";
import { getCashStory, type CashStoryData } from "@/lib/api/cash-story-api";

interface UseCashStoryOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}

/**
 * React Query hook to fetch AI-generated cash story.
 * Provides automatic caching, background refetching, and optimistic updates.
 */
export function useCashStory(
  tenantId: string | null,
  options: UseCashStoryOptions = {}
) {
  const {
    enabled = true,
    staleTime = 30_000, // 30 seconds
    refetchInterval = 60_000, // 60 seconds auto-refresh
  } = options;

  return useQuery<CashStoryData, Error>({
    queryKey: ["cash-story", tenantId],
    queryFn: () => {
      if (!tenantId) {
        return Promise.resolve({
          summary: '',
          cash_change: 0,
          total_inflows: 0,
          total_outflows: 0,
          drivers: [],
          risk_level: 'low',
          confidence: 0,
          generated_at: new Date().toISOString(),
        });
      }
      return getCashStory(tenantId);
    },
    enabled: enabled && !!tenantId,
    staleTime,
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
