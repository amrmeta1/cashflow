import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchWaterfallData,
  fetchMonthlyTrend,
  fetchBudgetVsActual,
  updateBudget,
} from "./mock-api";
import type { BudgetLine } from "./types";
import type { Category } from "@/components/reports/transactions/types";

export function useWaterfall(tenantId?: string) {
  return useQuery({
    queryKey: ["waterfall", tenantId],
    queryFn: () => fetchWaterfallData(tenantId),
    staleTime: 60_000,
  });
}

export function useMonthlyTrend(tenantId?: string, months = 6, locale = "en") {
  return useQuery({
    queryKey: ["monthly-trend", tenantId, months, locale],
    queryFn: () => fetchMonthlyTrend(tenantId, months, locale),
    staleTime: 60_000,
  });
}

export function useBudgetVsActual(tenantId?: string) {
  return useQuery({
    queryKey: ["budget-vs-actual", tenantId],
    queryFn: () => fetchBudgetVsActual(tenantId),
    staleTime: 30_000,
  });
}

export function useUpdateBudget(tenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ category, budget }: { category: Category; budget: number }) =>
      updateBudget(category, budget),
    onMutate: async ({ category, budget }) => {
      await qc.cancelQueries({ queryKey: ["budget-vs-actual", tenantId] });
      const prev = qc.getQueryData<BudgetLine[]>(["budget-vs-actual", tenantId]);
      qc.setQueryData<BudgetLine[]>(["budget-vs-actual", tenantId], (old) =>
        old?.map((b) => {
          if (b.category !== category) return b;
          const variance = b.actual - budget;
          const variancePct = budget > 0 ? (variance / budget) * 100 : 0;
          return { ...b, budget, variance, variancePct };
        }) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["budget-vs-actual", tenantId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["budget-vs-actual", tenantId] });
    },
  });
}
