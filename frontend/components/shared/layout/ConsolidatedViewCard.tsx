"use client";

import { useEntity } from "@/contexts/EntityContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useI18n } from "@/lib/i18n/context";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact card for the header showing "العرض الموحد" / "Consolidated View" and total group value.
 */
export function ConsolidatedViewCard() {
  const { totalGroupSAR } = useEntity();
  const { fmt } = useCurrency();
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 min-w-0 max-w-[160px]",
        "bg-muted/40 dark:bg-zinc-800/50 border-border/60",
        "hover:bg-muted/60 dark:hover:bg-zinc-800/70 hover:border-emerald-500/30",
        "transition-all duration-200",
      )}
    >
      <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
          {isAr ? "العرض الموحد" : "Consolidated"}
        </p>
        <p className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 truncate" dir="ltr">
          {fmt(totalGroupSAR)}
        </p>
      </div>
    </div>
  );
}
