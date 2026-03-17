"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSignals, runSignalEngine, type SignalResult } from "@/lib/api/signals-api";

interface UseSignalsOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  status?: string;
}

/**
 * React Query hook to fetch signals for a tenant.
 * Provides automatic caching, background refetching, and optimistic updates.
 */
export function useSignals(
  tenantId: string | null,
  options: UseSignalsOptions = {}
) {
  const {
    enabled = true,
    staleTime = 30_000, // 30 seconds
    refetchInterval = 60_000, // 1 minute
    status = "active",
  } = options;

  return useQuery<SignalResult, Error>({
    queryKey: ["signals", tenantId, status],
    queryFn: () => {
      if (!tenantId) {
        return Promise.resolve({
          tenant_id: "",
          signals: [],
          alerts: [],
          summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
        });
      }
      return getSignals(tenantId, status);
    },
    enabled: enabled && !!tenantId,
    staleTime,
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * React Query mutation hook to trigger signal detection.
 * Automatically invalidates signal queries on success.
 */
export function useRunSignalEngine(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!tenantId) throw new Error("Tenant ID required");
      return runSignalEngine(tenantId);
    },
    onSuccess: () => {
      // Invalidate all signal queries for this tenant
      queryClient.invalidateQueries({ queryKey: ["signals", tenantId] });
    },
  });
}
