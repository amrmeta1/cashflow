"use client";

import { useDemo } from "@/contexts/DemoContext";

/**
 * Client demo (URL /demo/[slug]): small banner "DEMO — {Company} — هذه بيانات تجريبية".
 * Dev-only fallback: when tenant is "demo" and not in client demo, show simple DEMO MODE.
 */
export function DemoModeBanner({ tenantId }: { tenantId: string | undefined }) {
  const demo = useDemo();

  if (demo.isDemoMode) {
    return (
      <div
        className="flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-medium bg-amber-500/15 text-amber-800 dark:text-amber-200 border-b border-amber-500/30"
        role="status"
        aria-label="Client demo mode"
      >
        <span className="uppercase tracking-wider">DEMO</span>
        <span aria-hidden>—</span>
        <span>{demo.companyName}</span>
        <span aria-hidden>—</span>
        <span className="text-amber-700 dark:text-amber-300">هذه بيانات تجريبية</span>
      </div>
    );
  }

  const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development";
  if (!isDev || tenantId !== "demo") return null;

  return (
    <div
      className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium bg-amber-500/90 text-amber-950 border-b border-amber-600/50"
      role="status"
      aria-label="Demo mode"
    >
      <span className="uppercase tracking-wider">DEMO MODE</span>
      <span aria-hidden>—</span>
      <span>Tenant: demo</span>
    </div>
  );
}
