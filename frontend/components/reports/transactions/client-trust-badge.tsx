"use client";

import { Sparkles } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/shared/ui/hover-card";
import { cn } from "@/lib/utils";
import type { TrustScore, Counterparty } from "@/components/reports/transactions/types";

// ── Color map ────────────────────────────────────────────────────────────────

const SCORE_STYLES: Record<TrustScore, string> = {
  "A+": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  "B":  "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
  "C":  "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  "F":  "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
};

// ── Props ────────────────────────────────────────────────────────────────────

interface ClientTrustBadgeProps {
  counterparty: Counterparty;
  isAr?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ClientTrustBadge({ counterparty, isAr = false }: ClientTrustBadgeProps) {
  const { aiTrustScore, averageDelayDays, aiInsight, aiInsightAr } = counterparty;

  if (!aiTrustScore) return null;

  const insight = isAr && aiInsightAr ? aiInsightAr : aiInsight;
  const delayIsHigh = (averageDelayDays ?? 0) > 15;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            "text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded cursor-help inline-flex items-center shrink-0",
            SCORE_STYLES[aiTrustScore]
          )}
        >
          {aiTrustScore}
        </span>
      </HoverCardTrigger>

      <HoverCardContent side="top" align="start" className="w-80 p-4">
        {/* Header */}
        <div className="flex items-center mb-3">
          <Sparkles className="h-4 w-4 me-2 text-primary shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isAr ? "تحليل مستشار AI" : "Mustashar AI Profiling"}
          </span>
          <span
            className={cn(
              "ms-auto text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded",
              SCORE_STYLES[aiTrustScore]
            )}
          >
            {aiTrustScore}
          </span>
        </div>

        {/* AI Insight log box */}
        {insight && (
          <div className="bg-muted/50 p-3 rounded-md border-s-2 border-primary ms-1 text-sm text-foreground leading-relaxed">
            {insight}
          </div>
        )}

        {/* Metrics row */}
        {averageDelayDays !== undefined && (
          <div className="mt-3 flex items-center justify-between rounded-md bg-muted/30 border px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {isAr ? "متوسط التأخير التاريخي" : "Avg Historical Delay"}
            </span>
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                delayIsHigh ? "text-destructive" : "text-foreground"
              )}
            >
              {averageDelayDays} {isAr ? "يوم" : "days"}
            </span>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
