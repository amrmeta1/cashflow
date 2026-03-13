"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setTenantId } from "@/lib/api/client";
import { TENANT_IDS } from "@/lib/tenant-constants";
import { DEMO_TENANT } from "@/lib/mocks/mock-data";
import type { Tenant, Membership } from "@/lib/api/types";

interface TenantContextValue {
  currentTenant: Tenant | null;
  memberships: (Membership & { tenant?: Tenant })[];
  setCurrentTenant: (tenant: Tenant) => void;
  setMemberships: (m: (Membership & { tenant?: Tenant })[]) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [memberships, setMemberships] = useState<
    (Membership & { tenant?: Tenant })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentTenant = useCallback(
    (tenant: Tenant) => {
      setCurrentTenantState(tenant);
      setTenantId(tenant.id);
      if (typeof window !== "undefined") {
        localStorage.setItem("currentTenantId", tenant.id);
        document.cookie = `${TENANT_IDS.cookie}=${tenant.id}; path=/; max-age=31536000; samesite=lax`;
      }
      queryClient.invalidateQueries();
    },
    [queryClient]
  );

  useEffect(() => {
    const savedId =
      typeof window !== "undefined"
        ? localStorage.getItem("currentTenantId")
        : null;
    if (savedId && memberships.length > 0) {
      const found = memberships.find((m) => m.tenant_id === savedId);
      if (found?.tenant) {
        setCurrentTenantState(found.tenant);
        setTenantId(found.tenant.id);
        return;
      }
    }
    // Development fallback: if no memberships (or no match) and we have no tenant, use demo so pages render
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV !== "production" &&
      memberships.length === 0 &&
      currentTenant === null
    ) {
      setCurrentTenantState(DEMO_TENANT);
      setTenantId(DEMO_TENANT.id);
    }
  }, [memberships, currentTenant]);

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        memberships,
        setCurrentTenant,
        setMemberships,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
