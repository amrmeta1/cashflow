"use client";

import { Bot, AlertTriangle, TrendingUp, Zap, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BriefItem, BriefItemType } from "./types";

// ── Config ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  BriefItemType,
  { icon: typeof Bot; dotColor: string; iconColor: string; labelEn: string; labelAr: string }
> = {
  insight: {
    icon: Lightbulb,
    dotColor: "bg-blue-500",
    iconColor: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
    labelEn: "Insight",
    labelAr: "رؤية",
  },
  alert: {
    icon: AlertTriangle,
    dotColor: "bg-red-500",
    iconColor: "text-red-600 bg-red-50 dark:bg-red-950/40",
    labelEn: "Alert",
    labelAr: "تنبيه",
  },
  forecast: {
    icon: TrendingUp,
    dotColor: "bg-violet-500",
    iconColor: "text-violet-600 bg-violet-50 dark:bg-violet-950/40",
    labelEn: "Forecast",
    labelAr: "توقع",
  },
  action: {
    icon: Zap,
    dotColor: "bg-amber-500",
    iconColor: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    labelEn: "Action",
    labelAr: "إجراء",
  },
};

// ── Skeleton ───────────────────────────────────────────────────────────────

function BriefSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-5 py-4">
          <Skeleton className="h-4 w-10 shrink-0 mt-1" />
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface BriefFeedProps {
  items: BriefItem[];
  isLoading: boolean;
  isAr: boolean;
}

export function BriefFeed({ items, isLoading, isAr }: BriefFeedProps) {
  if (isLoading) return <BriefSkeleton />;

  return (
    <div className="divide-y">
      {items.map((item, idx) => {
        const cfg = TYPE_CONFIG[item.type];
        const Icon = cfg.icon;
        const isLast = idx === items.length - 1;

        return (
          <div key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
            {/* Timestamp */}
            <span className="text-xs text-muted-foreground tabular-nums w-10 shrink-0 pt-0.5 text-end">
              {item.time}
            </span>

            {/* Icon + vertical connector */}
            <div className="flex flex-col items-center shrink-0">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", cfg.iconColor)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              {!isLast && (
                <div className="w-px flex-1 min-h-[1.5rem] mt-1 bg-border" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-1">
              {/* Agent name + type badge */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-semibold text-foreground">
                  {isAr ? item.agent_name_ar : item.agent_name_en}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                    cfg.iconColor
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                  {isAr ? cfg.labelAr : cfg.labelEn}
                </span>
              </div>

              {/* Message */}
              <p className="text-sm text-foreground leading-relaxed">
                {isAr ? item.message_ar : item.message_en}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
