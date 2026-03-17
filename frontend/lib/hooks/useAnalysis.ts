"use client";

import { useQuery } from "@tanstack/react-query";
import { getAnalysisLatest } from "@/lib/api/operations-api";
import { ApiClientError } from "@/lib/api/client";
const QUERY_KEY = "analysis-latest";

export function useAnalysis(tenantId: string | undefined) {
  console.log("🔍 useAnalysis hook called:", { tenantId, enabled: !!tenantId && tenantId !== "demo" });
  
  const query = useQuery({
    queryKey: [QUERY_KEY, tenantId],
    queryFn: () => {
      console.log("📤 Fetching analysis for tenant:", tenantId);
      return getAnalysisLatest(tenantId!);
    },
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
  
  console.log("📥 useAnalysis result:", {
    hasData: !!query.data,
    isLoading: query.isLoading,
    isNotFound,
    errorMessage: error?.message,
    transactionCount: query.data?.transaction_count
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isNotFound,
  };
}
