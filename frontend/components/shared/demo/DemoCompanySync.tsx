"use client";

import { useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useDemo } from "@/contexts/DemoContext";
import { setDemoMockOptions } from "@/lib/demo-mock-store";

/**
 * When inside DemoProvider with isDemoMode, sets an in-memory company override
 * and demo mock options so the rest of the app and mock data see the demo company.
 * Clears on unmount (e.g. when leaving /demo/).
 */
export function DemoCompanySync() {
  const demo = useDemo();
  const { setDemoOverride } = useCompany();

  useEffect(() => {
    if (!demo.isDemoMode) {
      setDemoOverride(null);
      setDemoMockOptions(null);
      return;
    }
    setDemoOverride({
      companyName: demo.companyName,
      industry: demo.industry,
      isConfigured: true,
    });
    setDemoMockOptions({ companyName: demo.companyName, industry: demo.industry });
    return () => {
      setDemoOverride(null);
      setDemoMockOptions(null);
    };
  }, [demo.isDemoMode, demo.companyName, demo.industry, setDemoOverride]);

  return null;
}
