"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useSidebar } from "@/lib/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar() {
  const { t, dir } = useI18n();
  const { visibleNav } = usePermissions();
  const { collapsed, toggle } = useSidebar();
  const isRtl = dir === "rtl";

  const CollapseIcon = collapsed
    ? isRtl ? ChevronLeft : ChevronRight
    : isRtl ? ChevronRight : ChevronLeft;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-sidebar
        className={cn(
          "hidden md:flex flex-col border-e bg-card transition-all duration-200 shrink-0 print:hidden",
          collapsed ? "w-[52px]" : "w-[240px]"
        )}
      >
        {/* Logo row */}
        <div className="flex h-12 items-center border-b px-3 gap-2 overflow-hidden shrink-0">
          <Link href="/app/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              CF
            </div>
            {!collapsed && (
              <span className="font-semibold text-sm truncate">
                {t.common.appName}
              </span>
            )}
          </Link>
        </div>

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
