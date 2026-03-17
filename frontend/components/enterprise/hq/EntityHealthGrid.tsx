"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { cn } from "@/lib/utils";
import {
  SUBSIDIARIES,
  STATUS_DOT,
  STATUS_RING,
  STATUS_LABEL,
  type Subsidiary,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSAR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}SAR ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}SAR ${(abs / 1_000).toFixed(0)}k`;
  return `${sign}SAR ${abs.toLocaleString("en-US")}`;
}

// ── Entity Card ───────────────────────────────────────────────────────────────

interface EntityCardProps {
  entity: Subsidiary;
  isAr: boolean;
}

function EntityCard({ entity, isAr }: EntityCardProps) {
  const isDeficit = entity.status === "deficit";
  const label = STATUS_LABEL[entity.status][isAr ? "ar" : "en"];

  return (
    <Card
      className={cn(
        "relative overflow-hidden ring-1 transition-shadow hover:shadow-md",
        STATUS_RING[entity.status]
      )}
    >
      {/* Subtle top accent bar */}
      <div
        className={cn(
          "absolute top-0 start-0 end-0 h-0.5",
          entity.status === "surplus" && "bg-emerald-500",
          entity.status === "deficit" && "bg-destructive",
          entity.status === "healthy" && "bg-blue-400"
        )}
      />

      <CardHeader className="pb-2 pt-5 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight line-clamp-1">
            {isAr ? entity.nameAr : entity.name}
          </CardTitle>
          <span
            className={cn(
              "inline-block h-2.5 w-2.5 rounded-full shrink-0",
              STATUS_DOT[entity.status]
            )}
          />
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Balance */}
        <p
          className={cn(
            "text-2xl font-bold tabular-nums tracking-tighter leading-none",
            isDeficit ? "text-destructive" : "text-foreground"
          )}
        >
          {fmtSAR(entity.balance)}
        </p>

        {/* Footer: status badge + trend + action */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 font-medium",
                entity.status === "surplus" &&
                  "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
                entity.status === "deficit" &&
                  "border-destructive/40 text-destructive",
                entity.status === "healthy" &&
                  "border-blue-400/40 text-blue-500 dark:text-blue-400"
              )}
            >
              {label}
            </Badge>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                entity.trendPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              )}
            >
              {entity.trend}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
          >
            {isAr ? "عرض السجل" : "View Sub-Ledger"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Grid ──────────────────────────────────────────────────────────────────────

interface EntityHealthGridProps {
  isAr: boolean;
}

export function EntityHealthGrid({ isAr }: EntityHealthGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {SUBSIDIARIES.map((entity) => (
        <EntityCard key={entity.id} entity={entity} isAr={isAr} />
      ))}
    </div>
  );
}
