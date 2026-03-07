"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { DemoModeBanner } from "./demo-mode-banner";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useDemo } from "@/contexts/DemoContext";
import { useI18n } from "@/lib/i18n/context";
import { Skeleton } from "@/components/ui/skeleton";
import { MustasharCopilot } from "@/components/ai/MustasharCopilot";
import { GlobalReportDialog } from "@/components/global/global-report-dialog";
import { getMockTenantList } from "@/lib/api/mock-data";

function AppShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex flex-col w-[240px] border-e bg-card shrink-0">
        <div className="flex h-12 items-center border-b px-3 gap-2">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex-1 py-3 px-2 space-y-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full rounded-md" />
          ))}
        </div>
      </div>
      {/* Main area skeleton */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-12 items-center border-b px-4 gap-3">
          <Skeleton className="h-5 w-40" />
          <div className="flex-1" />
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { dir } = useI18n();
  const demo = useDemo();
  const {
    currentTenant,
    setCurrentTenant,
    setMemberships,
    isLoading,
    setIsLoading,
  } = useTenant();

  const tenantInitDone = useRef(false);

  useEffect(() => {
    if (tenantInitDone.current) return;
    tenantInitDone.current = true;
    
    const mock = demo.isDemoMode 
      ? getMockTenantList(demo.companyName)
      : getMockTenantList();
      
    const membershipsWithTenant = mock.data.map((t) => ({
      id: t.id,
      tenant_id: t.id,
      user_id: "",
      role: "accountant_readonly" as const,
      status: "active" as const,
      created_at: t.created_at,
      updated_at: t.updated_at,
      tenant: t,
    }));
    
    setMemberships(membershipsWithTenant);
    if (mock.data.length > 0) setCurrentTenant(mock.data[0]);
    setIsLoading(false);
  }, [demo.isDemoMode, demo.companyName, setCurrentTenant, setMemberships, setIsLoading]);

  if (isLoading) return <AppShellSkeleton />;

  return (
    <div className="flex h-screen overflow-hidden" dir={dir}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DemoModeBanner tenantId={currentTenant?.id} />
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-20 [&:has([data-page-full])]:p-0 [&:has([data-page-full])]:pb-0 [&:has([data-page-full])]:overflow-hidden">
          {children}
        </main>
      </div>
      <MustasharCopilot />
      <GlobalReportDialog />
    </div>
  );
}
