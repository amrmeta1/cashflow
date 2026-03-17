"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchIntegrations,
  apiToggleIntegration,
  apiSyncIntegration,
  apiConnectIntegration,
} from "./mock-api";
import type { Integration } from "./types";

const KEY = ["integrations"] as const;

export function useIntegrations(tenantId?: string) {
  return useQuery({
    queryKey: [...KEY, tenantId],
    queryFn: fetchIntegrations,
    staleTime: 60_000,
  });
}

export function useToggleIntegration(tenantId?: string) {
  const qc = useQueryClient();
  const key = [...KEY, tenantId];

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiToggleIntegration(id, enabled),

    onMutate: async ({ id, enabled }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Integration[]>(key);
      qc.setQueryData<Integration[]>(key, (old) =>
        old?.map((i) => (i.id === id ? { ...i, enabled } : i))
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useSyncIntegration(tenantId?: string) {
  const qc = useQueryClient();
  const key = [...KEY, tenantId];

  return useMutation({
    mutationFn: (id: string) => apiSyncIntegration(id),
    onSuccess: (data) => {
      qc.setQueryData<Integration[]>(key, (old) =>
        old?.map((i) =>
          i.id === data.id ? { ...i, last_sync_at: new Date().toISOString() } : i
        )
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useConnectIntegration(tenantId?: string) {
  const qc = useQueryClient();
  const key = [...KEY, tenantId];

  return useMutation({
    mutationFn: (id: string) => apiConnectIntegration(id),
    onSuccess: (data) => {
      qc.setQueryData<Integration[]>(key, (old) =>
        old?.map((i) =>
          i.id === data.id ? { ...i, status: "connected", enabled: true } : i
        )
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
