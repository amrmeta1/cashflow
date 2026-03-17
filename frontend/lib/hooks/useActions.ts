"use client";

import { useQuery } from "@tanstack/react-query";
import { getActions, type ActionsData } from "@/lib/api/actions-api";

interface UseActionsOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}

/**
 * React Query hook to fetch recommended treasury actions for a tenant.
 * Provides automatic caching, background refetching, and error handling.
 */
export function useActions(
  tenantId: string | null,
  options: UseActionsOptions = {}
) {
  const {
    enabled = true,
    staleTime = 30_000, // 30 seconds
    refetchInterval = 60_000, // 60 seconds auto-refresh
  } = options;

  return useQuery<ActionsData, Error>({
    queryKey: ["actions", tenantId],
    queryFn: () => {
      if (!tenantId) {
        return Promise.resolve({ actions: [] });
      }
      return getActions(tenantId);
    },
    enabled: enabled && !!tenantId,
    staleTime,
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
