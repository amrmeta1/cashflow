"use client";

import { useQuery } from "@tanstack/react-query";
import { getAnalysisLatest } from "@/lib/api/ingestion-api";
import { ApiClientError } from "@/lib/api/client";
const QUERY_KEY = "analysis-latest";

export function useAnalysis(tenantId: string | undefined) {
  const query = useQuery({
    queryKey: [QUERY_KEY, tenantId],
    queryFn: () => getAnalysisLatest(tenantId!),
    enabled: !!tenantId && tenantId !== "demo",
    refetchInterval: (q) => {
      if (q.state.data) return false;
      const err = q.state.error;
      if (err instanceof ApiClientError && err.status === 404) return false;
      return 5000;
    },
  });

  const error = query.error;
  const isNotFound =
    error instanceof ApiClientError && error.status === 404;

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isNotFound,
  };
}
