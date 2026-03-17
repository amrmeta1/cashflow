"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSecurity,
  apiRevokeSession,
  apiRevokeAllSessions,
  apiToggleMfa,
  apiUpdateDomains,
} from "./mock-api";
import type { SecurityData } from "./types";

const KEY = ["security"] as const;

export function useSecurity(tenantId?: string) {
  return useQuery({
    queryKey: [...KEY, tenantId],
    queryFn: fetchSecurity,
    staleTime: 60_000,
  });
}

export function useRevokeSession(tenantId?: string) {
  const qc = useQueryClient();
  const key = [...KEY, tenantId];

  return useMutation({
    mutationFn: (id: string) => apiRevokeSession(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<SecurityData>(key);
      qc.setQueryData<SecurityData>(key, (old) =>
        old ? { ...old, sessions: old.sessions.filter((s) => s.id !== id) } : old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useRevokeAllSessions(tenantId?: string) {
  const qc = useQueryClient();
  const key = [...KEY, tenantId];

  return useMutation({
    mutationFn: () => apiRevokeAllSessions(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<SecurityData>(key);
      qc.setQueryData<SecurityData>(key, (old) =>
        old ? { ...old, sessions: old.sessions.filter((s) => s.current) } : old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useToggleMfa(tenantId?: string) {
  const qc = useQueryClient();
  const key = [...KEY, tenantId];

  return useMutation({
    mutationFn: (enabled: boolean) => apiToggleMfa(enabled),
    onMutate: async (enabled) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<SecurityData>(key);
      qc.setQueryData<SecurityData>(key, (old) =>
        old ? { ...old, mfa_enabled: enabled } : old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateDomains(tenantId?: string) {
  const qc = useQueryClient();
  const key = [...KEY, tenantId];

  return useMutation({
    mutationFn: (domains: string[]) => apiUpdateDomains(domains),
    onMutate: async (domains) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<SecurityData>(key);
      qc.setQueryData<SecurityData>(key, (old) =>
        old ? { ...old, allowed_domains: domains } : old
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
