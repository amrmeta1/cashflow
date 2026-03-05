"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { DemoModeBanner } from "./demo-mode-banner";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useDemo } from "@/contexts/DemoContext";
import { useI18n } from "@/lib/i18n/context";
import { useCommandMenu } from "@/lib/command-store";
import { listTenants } from "@/lib/api/tenant-api";
import { Skeleton } from "@/components/ui/skeleton";
import { MustasharCopilot } from "@/components/ai/MustasharCopilot";
import { GlobalReportDialog } from "@/components/global/global-report-dialog";
import { DEV_SKIP_AUTH, DEMO_TENANT, getMockTenantList } from "@/lib/api/mock-data";

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const { dir, locale } = useI18n();
  const { open: openCommandPalette } = useCommandMenu();
  const demo = useDemo();
  const isAr = locale === "ar";
  const {
    currentTenant,
    setCurrentTenant,
    setMemberships,
    isLoading,
    setIsLoading,
  } = useTenant();

  const tenantInitDone = useRef(false);

  useEffect(() => {
    if (demo.isDemoMode) {
      if (tenantInitDone.current) return;
      tenantInitDone.current = true;
      const mock = getMockTenantList(demo.companyName);
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
      return;
    }
    if (DEV_SKIP_AUTH && status === "unauthenticated") {
      if (tenantInitDone.current) return;
      tenantInitDone.current = true;
      const mock = getMockTenantList();
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
      if (mock.data.length > 0) {
        setCurrentTenant(mock.data[0]);
      }
      setIsLoading(false);
      return;
    }
    if (status === "unauthenticated" && !DEV_SKIP_AUTH) {
      router.push("/login");
    }
  }, [demo.isDemoMode, demo.companyName, status, router, setCurrentTenant, setMemberships, setIsLoading]);

  const { data: tenantList } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => listTenants(),
    enabled: status === "authenticated" && !DEV_SKIP_AUTH,
  });

  useEffect(() => {
    if (DEV_SKIP_AUTH) return;
    if (!tenantList?.data) return;
    if (tenantInitDone.current) return;
    tenantInitDone.current = true;

    // Authenticated but no tenants (e.g. new user): in dev use demo tenant so pages still render
    if (tenantList.data.length === 0 && process.env.NODE_ENV !== "production") {
      const demoMembership = {
        id: "demo-m",
        tenant_id: DEMO_TENANT.id,
        user_id: "",
        role: "accountant_readonly" as const,
        status: "active" as const,
        created_at: DEMO_TENANT.created_at,
        updated_at: DEMO_TENANT.updated_at,
        tenant: DEMO_TENANT,
      };
      setMemberships([demoMembership]);
      setCurrentTenant(DEMO_TENANT);
      setIsLoading(false);
      return;
    }

    const membershipsWithTenant = tenantList.data.map((t) => ({
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

    if (tenantList.data.length > 0) {
      const savedId =
        typeof window !== "undefined"
          ? localStorage.getItem("currentTenantId")
          : null;
      const found = tenantList.data.find((t) => t.id === savedId);
      setCurrentTenant(found ?? tenantList.data[0]);
    }

    setIsLoading(false);
  }, [tenantList, setCurrentTenant, setMemberships, setIsLoading]);

  if (status === "loading" && !DEV_SKIP_AUTH && !demo.isDemoMode) return <AppShellSkeleton />;
  if (status === "unauthenticated" && !DEV_SKIP_AUTH && !demo.isDemoMode) return null;
  if ((DEV_SKIP_AUTH || demo.isDemoMode) && status === "unauthenticated" && isLoading) return <AppShellSkeleton />;

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
