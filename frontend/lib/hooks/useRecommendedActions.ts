"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRecommendedActions, type ActionsData } from "@/lib/api/liquidity-api";

interface UseRecommendedActionsOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * React Query hook to fetch AI-recommended treasury actions.
 * Provides automatic caching, background refetching, and optimistic updates.
 */
export function useRecommendedActions(
  tenantId: string | null,
  options: UseRecommendedActionsOptions = {}
) {
  const {
    enabled = true,
    staleTime = 5 * 60_000, // 5 minutes
  } = options;

  return useQuery<ActionsData, Error>({
    queryKey: ["recommended-actions", tenantId],
    queryFn: () => {
      if (!tenantId) {
        throw new Error("Tenant ID is required");
      }
      return fetchRecommendedActions(tenantId);
    },
    enabled: enabled && !!tenantId,
    staleTime,
    gcTime: 10 * 60_000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
