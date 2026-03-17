"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/shared/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/ui/table";
import { Department, getSpendStatus } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSAR(n: number): string {
  return `SAR ${n.toLocaleString("en-US")}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DrillDownSheetProps {
  dept: Department | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAr: boolean;
  dir: "ltr" | "rtl";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DrillDownSheet({
  dept,
  open,
  onOpenChange,
  isAr,
  dir,
}: DrillDownSheetProps) {
  if (!dept) return null;

  const pct = (dept.actual / dept.budget) * 100;
  const status = getSpendStatus(pct);
  const isOverBudget = status === "danger";
  const insight = isAr ? dept.aiInsight_ar : dept.aiInsight;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={dir === "rtl" ? "left" : "right"}
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        {/* ── Header ── */}
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 flex-wrap text-start">
            {isAr ? dept.name_ar : dept.name}
            {isOverBudget && (
              <Badge variant="destructive" className="shrink-0">
                {isAr ? "تجاوز الميزانية" : "Over Budget"}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          {/* ── AI Insight callout ── */}
          {insight && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
              <Sparkles className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive leading-relaxed">{insight}</p>
            </div>
          )}

          {/* ── Transaction breakdown ── */}
          {dept.transactions && dept.transactions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {isAr ? "تفاصيل المصروفات" : "Spend Breakdown"}
              </p>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start ps-4">
                        {isAr ? "الوصف" : "Description"}
                      </TableHead>
                      <TableHead className="text-end pe-4">
                        {isAr ? "المبلغ" : "Amount"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dept.transactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="text-start ps-4 text-sm">
                          {isAr ? txn.description_ar : txn.description}
                        </TableCell>
                        <TableCell className="text-end pe-4 tabular-nums font-mono text-sm font-semibold text-destructive">
                          {fmtSAR(txn.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="bg-muted/40 font-bold">
                      <TableCell className="text-start ps-4 text-sm font-bold">
                        {isAr ? "الإجمالي" : "Total"}
                      </TableCell>
                      <TableCell className="text-end pe-4 tabular-nums font-mono text-sm font-bold text-destructive">
                        {fmtSAR(dept.actual)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ── Action button ── */}
          {isOverBudget && (
            <Button
              className="w-full gap-2 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]"
              size="lg"
            >
              ⚡{" "}
              {isAr
                ? "تنفيذ إعادة التخصيص بالذكاء الاصطناعي (نقل 15k من القانوني)"
                : "Execute AI Reallocation (Move 15k from Legal)"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
