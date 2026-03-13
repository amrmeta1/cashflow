"use client";

import { useQuery } from "@tanstack/react-query";
import { getDailyBrief, type DailyBriefData } from "@/lib/api/daily-brief-api";

interface UseDailyBriefOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}

/**
 * React Query hook to fetch AI-generated daily treasury brief.
 * Provides automatic caching, background refetching, and optimistic updates.
 */
export function useDailyBrief(
  tenantId: string | null,
  options: UseDailyBriefOptions = {}
) {
  const {
    enabled = true,
    staleTime = 30_000, // 30 seconds
    refetchInterval = 60_000, // 60 seconds auto-refresh
  } = options;

  return useQuery<DailyBriefData, Error>({
    queryKey: ["daily-brief", tenantId],
    queryFn: () => {
      if (!tenantId) {
        return Promise.resolve({
          date: new Date().toISOString(),
          summary: '',
          lastUpdated: new Date().toISOString(),
          confidence: 0,
          dataQuality: 0,
          risks: [],
          opportunities: [],
          recommendations: [],
        });
      }
      return getDailyBrief(tenantId);
    },
    enabled: enabled && !!tenantId,
    staleTime,
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
