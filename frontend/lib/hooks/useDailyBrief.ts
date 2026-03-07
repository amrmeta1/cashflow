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
    staleTime = 5 * 60_000, // 5 minutes - brief changes less frequently
    refetchInterval = 15 * 60_000, // 15 minutes
  } = options;

  return useQuery<DailyBriefData, Error>({
    queryKey: ["daily-brief", tenantId],
    queryFn: () => {
      if (!tenantId) {
        throw new Error("Tenant ID is required");
      }
      return getDailyBrief(tenantId);
    },
    enabled: enabled && !!tenantId,
    staleTime,
    gcTime: 10 * 60_000, // 10 minutes
    refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
