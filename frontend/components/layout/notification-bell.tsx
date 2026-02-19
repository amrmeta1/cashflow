"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/features/alerts/hooks";
import { useI18n } from "@/lib/i18n/context";

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-400",
  info: "bg-blue-400",
};

function relativeTime(iso: string, isAr: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  if (h > 0) return isAr ? `منذ ${h}س` : `${h}h ago`;
  if (m > 0) return isAr ? `منذ ${m}د` : `${m}m ago`;
  return isAr ? "الآن" : "just now";
}

export function NotificationBell() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const { data: alerts = [] } = useAlerts(undefined);
  const openAlerts = alerts.filter((a) => a.status === "open");
  const topAlerts = openAlerts.slice(0, 3);
  const count = openAlerts.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute top-0.5 end-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-0.5 leading-none">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold">
            {isAr ? "التنبيهات" : "Notifications"}
          </span>
          {count > 0 && (
            <span className="text-xs text-muted-foreground">
              {count} {isAr ? "مفتوح" : "open"}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {topAlerts.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            {isAr ? "لا توجد تنبيهات مفتوحة" : "No open alerts"}
          </div>
        ) : (
          topAlerts.map((alert) => (
            <DropdownMenuItem key={alert.id} asChild className="cursor-pointer px-3 py-2.5">
              <Link href="/app/alerts" className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    SEVERITY_DOT[alert.severity] ?? "bg-zinc-400"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug truncate">
                    {isAr ? alert.title_ar : alert.title_en}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                    {relativeTime(alert.created_at, isAr)}
                  </p>
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/app/alerts" className="flex justify-center text-xs text-primary py-1.5">
            {isAr ? "عرض جميع التنبيهات" : "View all alerts"}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
