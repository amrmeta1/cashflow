"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { getCashPosition } from "@/lib/api/ingestion-api";
import type { CashPositionResponse } from "@/lib/api/types";

const QUERY_KEY = "cash-position";

/** YYYY-MM-DD for yesterday (for net change vs yesterday). */
export function getYesterdayAsOf(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Generate YYYY-MM-DD for the last N days (including today). */
export function getLastNDaysAsOf(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function useCashPosition(tenantId: string | undefined, asOf?: string) {
  const query = useQuery({
    queryKey: [QUERY_KEY, tenantId, asOf ?? "today"],
    queryFn: () => getCashPosition(tenantId!, asOf),
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const totalBalance =
    query.data?.totals?.byCurrency?.reduce((sum, c) => sum + c.balance, 0) ?? 0;

  return {
    data: query.data ?? null,
    accounts: query.data?.accounts ?? [],
    totals: query.data?.totals ?? { byCurrency: [] },
    totalBalance,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export interface CashPositionHistoryPoint {
  date: string;
  asOf: string;
  totalBalance: number;
}

/** Fetch cash position for the last N days (backend must support asOf). Use for historical chart. */
export function useCashPositionHistory(
  tenantId: string | undefined,
  days: number = 14
) {
  const asOfDates = getLastNDaysAsOf(days);
  const queries = useQueries({
    queries: asOfDates.map((asOf) => ({
      queryKey: [QUERY_KEY, tenantId, asOf],
      queryFn: () => getCashPosition(tenantId!, asOf),
      enabled: !!tenantId,
      staleTime: 5 * 60_000,
    })),
  });

  const points: CashPositionHistoryPoint[] = queries
    .map((q, i) => {
      const data = q.data;
      if (!data) return null;
      const total =
        data.totals?.byCurrency?.reduce((s, c) => s + c.balance, 0) ?? 0;
      return {
        date: asOfDates[i],
        asOf: asOfDates[i],
        totalBalance: total,
      };
    })
    .filter((p): p is CashPositionHistoryPoint => p != null);

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);

  return {
    points,
    isLoading,
    isFetching,
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
  };
}
