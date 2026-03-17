import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTransactions,
  updateTransaction,
  bulkRecategorize,
  deleteTransaction,
} from "./mock-api";
import type {
  TransactionFilters,
  UpdateTransactionPayload,
  BulkRecategorizePayload,
  Transaction,
} from "./types";

const QK = (tenantId?: string, filters?: TransactionFilters) => [
  "transactions",
  tenantId,
  filters,
];

export function useTransactions(
  tenantId: string | undefined,
  filters: TransactionFilters = {}
) {
  return useQuery({
    queryKey: QK(tenantId, filters),
    queryFn: () => fetchTransactions(tenantId, filters),
    staleTime: 30_000,
  });
}

export function useUpdateTransaction(tenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTransactionPayload }) =>
      updateTransaction(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: ["transactions", tenantId] });
      const prev = qc.getQueriesData<Transaction[]>({ queryKey: ["transactions", tenantId] });
      qc.setQueriesData<Transaction[]>(
        { queryKey: ["transactions", tenantId] },
        (old) => old?.map((t) => (t.id === id ? { ...t, ...payload } : t)) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        for (const [key, data] of ctx.prev) qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["transactions", tenantId] });
    },
  });
}

export function useBulkRecategorize(tenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkRecategorizePayload) => bulkRecategorize(payload),
    onMutate: async ({ ids, category }) => {
      await qc.cancelQueries({ queryKey: ["transactions", tenantId] });
      const prev = qc.getQueriesData<Transaction[]>({ queryKey: ["transactions", tenantId] });
      qc.setQueriesData<Transaction[]>(
        { queryKey: ["transactions", tenantId] },
        (old) =>
          old?.map((t) => (ids.includes(t.id) ? { ...t, category } : t)) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        for (const [key, data] of ctx.prev) qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["transactions", tenantId] });
    },
  });
}

export function useDeleteTransaction(tenantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["transactions", tenantId] });
      const prev = qc.getQueriesData<Transaction[]>({ queryKey: ["transactions", tenantId] });
      qc.setQueriesData<Transaction[]>(
        { queryKey: ["transactions", tenantId] },
        (old) => old?.filter((t) => t.id !== id) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        for (const [key, data] of ctx.prev) qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["transactions", tenantId] });
    },
  });
}
