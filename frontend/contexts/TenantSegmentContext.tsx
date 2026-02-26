"use client";

import React, { createContext, useContext, useMemo } from "react";

export type TenantSegment = "saas" | "delivery" | "merchant" | "generic";

interface TenantSegmentContextValue {
  segment: TenantSegment;
  /** Placeholder for SaaS: runway in months (from backend later). */
  runwayMonths?: number;
  /** Placeholder for SaaS: monthly burn (from backend later). */
  monthlyBurn?: number;
}

const TenantSegmentContext = createContext<TenantSegmentContextValue | null>(null);

const DEFAULT_VALUE: TenantSegmentContextValue = {
  segment: "generic",
};

interface TenantSegmentProviderProps {
  children: React.ReactNode;
  /** Segment; default "generic". Wire from tenant metadata later. */
  segment?: TenantSegment;
  runwayMonths?: number;
  monthlyBurn?: number;
}

export function TenantSegmentProvider({
  children,
  segment = "generic",
  runwayMonths,
  monthlyBurn,
}: TenantSegmentProviderProps) {
  const value = useMemo<TenantSegmentContextValue>(
    () => ({ segment, runwayMonths, monthlyBurn }),
    [segment, runwayMonths, monthlyBurn]
  );
  return (
    <TenantSegmentContext.Provider value={value}>
      {children}
    </TenantSegmentContext.Provider>
  );
}

export function useTenantSegment(): TenantSegmentContextValue {
  const ctx = useContext(TenantSegmentContext);
  return ctx ?? DEFAULT_VALUE;
}
