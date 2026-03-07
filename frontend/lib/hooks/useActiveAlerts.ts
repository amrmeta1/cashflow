"use client";

import { useQuery } from "@tanstack/react-query";
import { getActiveAlerts, type Alert } from "@/lib/api/alerts-api";

interface UseActiveAlertsOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}

/**
 * React Query hook to fetch active alerts for a tenant.
 * Provides automatic caching, background refetching, and optimistic updates.
 */
export function useActiveAlerts(
  tenantId: string | null,
  options: UseActiveAlertsOptions = {}
) {
  const {
    enabled = true,
    staleTime = 30_000, // 30 seconds
    refetchInterval = 60_000, // 1 minute
  } = options;

  return useQuery<Alert[], Error>({
    queryKey: ["alerts", "active", tenantId],
    queryFn: () => {
      if (!tenantId) {
        return Promise.resolve([]);
      }
      return getActiveAlerts(tenantId);
    },
    enabled: enabled && !!tenantId,
    staleTime,
    gcTime: 5 * 60_000, // 5 minutes
    refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
