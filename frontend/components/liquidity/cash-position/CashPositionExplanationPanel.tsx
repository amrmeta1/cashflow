"use client";

import { Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/shared/ui/sheet";
import { Skeleton } from "@/components/shared/ui/skeleton";
import type { CashPositionExplanation } from "@/components/liquidity/cash-position/types";
import { cn } from "@/lib/utils";

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CashPositionExplanationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explanation: CashPositionExplanation | null;
  loading?: boolean;
  isAr?: boolean;
}

export function CashPositionExplanationPanel({
  open,
  onOpenChange,
  explanation,
  loading = false,
  isAr = false,
}: CashPositionExplanationPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isAr ? "left" : "right"}
        className="flex flex-col"
        aria-describedby="cash-position-explanation-desc"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            {isAr ? "شرح الوضع النقدي" : "Explain this"}
          </SheetTitle>
          <SheetDescription id="cash-position-explanation-desc">
            {isAr
              ? "كيف يتكون إجمالي الرصيد النقدي اليوم من الحسابات والمعاملات الأخيرة."
              : "How today's total cash is composed from accounts and recent transactions."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-6 space-y-6">
          {loading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : !explanation ? (
            <p className="text-sm text-muted-foreground">
              {isAr ? "لا توجد بيانات لعرضها." : "No data to display."}
            </p>
          ) : (
            <>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {isAr ? "التكوين حسب الحساب" : "Composition by account"}
                </h4>
                <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                  {explanation.composition.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      {isAr ? "لا حسابات" : "No accounts"}
                    </p>
                  ) : (
                    explanation.composition.map((item) => (
                      <div
                        key={item.accountId}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.currency}</p>
                        </div>
                        <span className="text-sm font-mono tabular-nums shrink-0">
                          {fmt(item.balance)} {item.currency}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {isAr ? "الإجمالي:" : "Total:"}{" "}
                  <span className="font-semibold text-foreground" dir="ltr">
                    {fmt(explanation.totalCash)} {explanation.primaryCurrency}
                  </span>
                  {explanation.usdEquivalent != null && (
                    <span className="ms-1" dir="ltr">
                      (~USD {fmt(explanation.usdEquivalent)})
                    </span>
                  )}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {isAr ? "آخر المعاملات المؤثرة" : "Recent material transactions"}
                </h4>
                <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                  {explanation.recentTransactions.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      {isAr ? "لا معاملات حديثة" : "No recent transactions"}
                    </p>
                  ) : (
                    explanation.recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <p className="text-sm truncate flex-1 min-w-0">{tx.description || "—"}</p>
                        <span
                          className={cn(
                            "text-sm font-mono tabular-nums shrink-0",
                            tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                          )}
                          dir="ltr"
                        >
                          {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {isAr ? "سيتم ربط البيانات من الخادم لاحقاً." : "Data will be wired from backend later."}
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
