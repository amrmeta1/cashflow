"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBilling } from "./mock-api";

const BILLING_KEY = ["billing"] as const;

export function useBilling(tenantId?: string) {
  return useQuery({
    queryKey: [...BILLING_KEY, tenantId],
    queryFn: fetchBilling,
    staleTime: 120_000,
  });
}
