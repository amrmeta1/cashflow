"use client";

import { Card } from "@/components/shared/ui/card";
import { cn } from "@/lib/utils";
import {
  Department,
  getSpendStatus,
  STATUS_BAR_COLOR,
  STATUS_BORDER_COLOR,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const YTD_PCT = 16.6; // 2 months / 12 months

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSAR(n: number): string {
  if (n >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `SAR ${(n / 1_000).toFixed(0)}k`;
  return `SAR ${n.toLocaleString("en-US")}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DepartmentRowProps {
  dept: Department;
  isAr: boolean;
  onClick: (dept: Department) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DepartmentRow({ dept, isAr, onClick }: DepartmentRowProps) {
  const pct = (dept.actual / dept.budget) * 100;
  const barWidth = Math.min(100, pct);
  const status = getSpendStatus(pct);
  const barColor = STATUS_BAR_COLOR[status];
  const borderColor = STATUS_BORDER_COLOR[status];

  return (
    <Card
      onClick={() => onClick(dept)}
      className={cn(
        "cursor-pointer p-5 border-s-4 transition-colors hover:bg-muted/50",
        borderColor
      )}
    >
      {/* ── Row header ── */}
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-sm">
          {isAr ? dept.name_ar : dept.name}
        </span>
        <span className="ms-auto text-sm tabular-nums text-muted-foreground whitespace-nowrap">
          {fmtSAR(dept.actual)} / {fmtSAR(dept.budget)}
        </span>
        <span
          className={cn(
            "text-xs font-bold tabular-nums",
            status === "danger"
              ? "text-destructive"
              : status === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {pct.toFixed(0)}%
        </span>
      </div>

      {/* ── Heatmap bar ── */}
      <div className="relative mt-4 h-4 w-full overflow-hidden rounded-full bg-muted">
        {/* Filled bar */}
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${barWidth}%` }}
        />

        {/* YTD burn-rate marker line */}
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground/40 z-10"
          style={{ insetInlineStart: `${YTD_PCT}%` }}
        />
      </div>

      {/* ── YTD label ── */}
      <div
        className="relative mt-1"
        style={{ paddingInlineStart: `${YTD_PCT}%` }}
      >
        <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">
          {isAr ? `المعدل المتوقع (${YTD_PCT}%)` : `Expected YTD (${YTD_PCT}%)`}
        </span>
      </div>
    </Card>
  );
}
