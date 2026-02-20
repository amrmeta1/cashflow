"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { useCompany, COUNTRY_PROFILES } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar() {
  const { t, dir } = useI18n();
  const { visibleNav } = usePermissions();
  const { collapsed, toggle } = useSidebar();
  const { profile } = useCompany();
  const isRtl = dir === "rtl";

  const CollapseIcon = collapsed
    ? isRtl ? ChevronLeft : ChevronRight
    : isRtl ? ChevronRight : ChevronLeft;

  const companyName = profile.companyName || "CashFlow.ai Workspace";
  const cp = profile.country ? COUNTRY_PROFILES[profile.country] : null;
  const flag = cp?.flag ?? null;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-sidebar
        className={cn(
          "hidden md:flex flex-col border-e bg-card transition-all duration-200 shrink-0 print:hidden",
          collapsed ? "w-[52px]" : "w-[240px]"
        )}
      >
        {/* ── Company header ── */}
        <Link
          href="/app/dashboard"
          className={cn(
            "flex h-14 items-center border-b px-3 gap-2.5 overflow-hidden shrink-0 hover:bg-accent/50 transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          {/* Badge / flag */}
          {collapsed ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              {flag ?? "CF"}
            </div>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-base leading-none">
              {flag ?? (
                <span className="text-primary font-bold text-xs">CF</span>
              )}
            </div>
          )}

          {!collapsed && (
            <div className="min-w-0">
              <p suppressHydrationWarning className="text-sm font-semibold truncate leading-tight">
                {companyName}
              </p>
              {cp && (
                <p suppressHydrationWarning className="text-[10px] text-muted-foreground truncate tabular-nums">
                  {cp.currency} · {cp.taxAuthority}
                </p>
              )}
            </div>
          )}
        </Link>

        {/* Nav */}
        <SidebarNav items={visibleNav()} collapsed={collapsed} />

        {/* Collapse toggle */}
        <div className="border-t p-1.5 shrink-0">
          <button
            onClick={toggle}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              collapsed && "justify-center px-0"
            )}
            aria-label="Toggle sidebar"
          >
            <CollapseIcon className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && (
              <span>{isRtl ? "طي" : "Collapse"}</span>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
