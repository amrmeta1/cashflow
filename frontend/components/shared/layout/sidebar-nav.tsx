"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shared/ui/tooltip";
import {
  NAV_GROUP_LABELS,
  type NavItem,
  type NavGroup,
} from "@/lib/config/navigation";
import type { dictionaries } from "@/lib/i18n/dictionaries";

interface SidebarNavProps {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}

const GROUP_ORDER: NavGroup[] = ["csuite", "ai", "ops", "settings"];

export function SidebarNav({ items, collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { t, locale, dir } = useI18n();
  const isAr = locale === "ar";
  const isRtl = dir === "rtl";

  const grouped = GROUP_ORDER.reduce<Record<NavGroup, NavItem[]>>(
    (acc, g) => {
      acc[g] = items.filter((i) => i.group === g);
      return acc;
    },
    { csuite: [], ai: [], ops: [], settings: [] }
  );

  return (
    <nav className="flex-1 py-2 overflow-y-auto">
      {GROUP_ORDER.map((group) => {
        const groupItems = grouped[group];
        if (!groupItems.length) return null;
        const label = NAV_GROUP_LABELS[group][isAr ? "ar" : "en"];

        return (
          <div key={group} className="mb-1">
            {!collapsed && (
              <p suppressHydrationWarning className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none truncate">
                {label}
              </p>
            )}
            {collapsed && group !== "csuite" && (
              <div className="my-1 mx-2 border-t" />
            )}
            <div className="px-1.5 space-y-0.5">
              {groupItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + "/");

                const linkEl = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-zinc-100 dark:bg-zinc-800/60 text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/30 hover:text-foreground"
                    )}
                  >
                    {isActive && !collapsed && (
                      <span className="absolute start-0 inset-y-1 w-0.5 rounded-full bg-primary" />
                    )}
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span suppressHydrationWarning className="truncate">{t.nav[item.translationKey]}</span>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                      <TooltipContent side={isRtl ? "left" : "right"}>
                        <span suppressHydrationWarning>{t.nav[item.translationKey]}</span>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.key}>{linkEl}</div>;
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
