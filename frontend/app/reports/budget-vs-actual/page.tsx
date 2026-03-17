"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Target, Pencil, Check, X, AlertTriangle, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { DepartmentRow } from "@/components/reports/budget/DepartmentRow";
import { DrillDownSheet } from "@/components/reports/budget/DrillDownSheet";
import { DEPARTMENTS, type Department } from "@/components/reports/budget/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useToast } from "@/components/shared/ui/toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { useBudgetVsActual, useUpdateBudget } from "@/components/liquidity/analytics/hooks";
import { getAvailablePeriods } from "@/components/liquidity/analytics/mock-api";
import type { BudgetLine } from "@/components/liquidity/analytics/types";
import type { Category } from "@/components/reports/transactions/types";

function ChartTooltip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs min-w-[160px]">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-0.5">
          <span className="text-muted-foreground">{p.name}</span>
          <span className={cn("font-medium tabular-nums", p.dataKey === "actual" ? "text-foreground" : "text-muted-foreground")}>
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface EditableBudgetRowProps {
  line: BudgetLine;
  isAr: boolean;
  fmt: (amountInSAR: number) => string;
  onSave: (category: Category, budget: number) => void;
  isPending: boolean;
}

function EditableBudgetRow({ line, isAr, fmt, onSave, isPending }: EditableBudgetRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(line.budget));

  const overBudget = line.variance > 0;
  const pct = Math.abs(line.variancePct);
  const isSignificant = pct > 10;

  const handleSave = () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && val >= 0) {
      onSave(line.category, val);
      setEditing(false);
    }
  };

  return (
    <tr className={cn(
      "border-b transition-colors hover:bg-muted/30",
      overBudget && isSignificant && "bg-rose-50/40 dark:bg-rose-950/10"
    )}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {overBudget && isSignificant && (
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-medium">{line.category}</span>
        </div>
      </td>

      {/* Budget (editable) */}
      <td className="px-4 py-2.5">
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-7 w-28 text-xs tabular-nums"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave} disabled={isPending}>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group">
            <span className="tabular-nums text-sm text-muted-foreground">
              {fmt(line.budget)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => { setDraft(String(line.budget)); setEditing(true); }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </td>

      {/* Actual */}
      <td className="px-4 py-2.5">
        <span className="tabular-nums text-sm font-medium">
          {fmt(line.actual)}
        </span>
      </td>

      {/* Variance */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {overBudget
            ? <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
            : <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
          }
          <span className={cn("tabular-nums text-sm font-medium", overBudget ? "text-rose-600" : "text-emerald-600")}>
            {overBudget ? "+" : ""}{fmt(line.variance)}
          </span>
        </div>
      </td>

      {/* Variance % + progress bar */}
      <td className="px-4 py-2.5 w-40">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className={cn("font-medium tabular-nums", overBudget ? "text-rose-600" : "text-emerald-600")}>
              {overBudget ? "+" : ""}{line.variancePct.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">
              {isAr ? "من الميزانية" : "of budget"}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", overBudget ? "bg-rose-500" : "bg-emerald-500")}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function BudgetPage() {
  const { locale, dir } = useI18n();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const { fmt, fmtAxis } = useCurrency();
  const isAr = locale === "ar";

  const periods = getAvailablePeriods();
  const [period, setPeriod] = useState(periods[0]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleDeptClick = (dept: Department) => {
    setSelectedDept(dept);
    setSheetOpen(true);
  };

  const { data: lines = [], isLoading } = useBudgetVsActual(currentTenant?.id);
  const updateMutation = useUpdateBudget(currentTenant?.id);

  const handleSave = (category: Category, budget: number) => {
    updateMutation.mutate({ category, budget }, {
      onSuccess: () => toast({
        title: isAr ? "تم تحديث الميزانية" : "Budget updated",
        variant: "success",
      }),
    });
  };

  const totalBudget = lines.reduce((s, l) => s + l.budget, 0);
  const totalActual = lines.reduce((s, l) => s + l.actual, 0);
  const totalVariance = totalActual - totalBudget;
  const overCount = lines.filter((l) => l.variance > 0).length;

  const chartData = lines.map((l) => ({
    category: l.category.length > 10 ? l.category.slice(0, 9) + "…" : l.category,
    budget: l.budget,
    actual: l.actual,
  }));

  return (
    <div dir={dir} className="flex flex-col gap-5 p-5 md:p-6 overflow-y-auto h-full" data-page-full>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">
            {isAr ? "الميزانية مقابل الفعلي" : "Budget vs Actual"}
          </h1>
        </div>
        {/* Period selector */}
        <div className="flex rounded-md border overflow-hidden text-xs">
          {periods.slice(0, 4).map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors whitespace-nowrap",
                period.label === p.label
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI strip ── */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: isAr ? "إجمالي الميزانية" : "Total Budget",
              value: totalBudget,
              color: "text-foreground",
              bg: "bg-zinc-100 dark:bg-zinc-800",
              icon: Target,
            },
            {
              label: isAr ? "إجمالي الفعلي" : "Total Actual",
              value: totalActual,
              color: totalActual > totalBudget ? "text-rose-600" : "text-emerald-600",
              bg: totalActual > totalBudget ? "bg-rose-50 dark:bg-rose-950/40" : "bg-emerald-50 dark:bg-emerald-950/40",
              icon: totalActual > totalBudget ? TrendingUp : TrendingDown,
            },
            {
              label: isAr ? `${overCount} فئات تجاوزت` : `${overCount} over budget`,
              value: Math.abs(totalVariance),
              color: totalVariance > 0 ? "text-rose-600" : "text-emerald-600",
              bg: totalVariance > 0 ? "bg-rose-50 dark:bg-rose-950/40" : "bg-emerald-50 dark:bg-emerald-950/40",
              icon: AlertTriangle,
              prefix: totalVariance > 0 ? "+" : "-",
            },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</CardTitle>
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", kpi.bg)}>
                  <kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <span className={cn("text-xl font-semibold tracking-tight tabular-nums", kpi.color)}>
                  {(kpi as any).prefix ?? ""}{fmt(kpi.value)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Bar chart ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">
            {isAr ? "مقارنة الميزانية والفعلي" : "Budget vs Actual by Category"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 55 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(240 5.9% 90%)" />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: "hsl(240 3.8% 46.1%)" }}
                    axisLine={false}
                    tickLine={false}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v: number) => fmtAxis(v)}
                  />
                  <Tooltip content={<ChartTooltip fmt={fmt} />} />
                  <Bar dataKey="budget" name={isAr ? "الميزانية" : "Budget"} fill="hsl(240 5.9% 78%)" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="actual" name={isAr ? "الفعلي" : "Actual"} radius={[3, 3, 0, 0]} maxBarSize={24}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.actual > entry.budget ? "hsl(0 72% 51%)" : "hsl(142 71% 45%)"}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail table ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">
            {isAr ? "تفاصيل الميزانية" : "Budget Detail"}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr ? "انقر على أيقونة القلم لتعديل الميزانية" : "Hover a row and click the pencil to edit budget"}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur border-b">
                  <tr>
                    {[
                      isAr ? "الفئة" : "Category",
                      isAr ? "الميزانية" : "Budget",
                      isAr ? "الفعلي" : "Actual",
                      isAr ? "الفرق" : "Variance",
                      isAr ? "النسبة" : "% Variance",
                    ].map((h) => (
                      <th key={h} className="px-4 py-2 text-start text-xs font-medium text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line) => (
                    <EditableBudgetRow
                      key={line.id}
                      line={line}
                      isAr={isAr}
                      fmt={fmt}
                      onSave={handleSave}
                      isPending={updateMutation.isPending}
                    />
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/30">
                  <tr>
                    <td className="px-4 py-2.5 text-sm font-semibold">{isAr ? "الإجمالي" : "Total"}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground tabular-nums">{fmt(totalBudget)}</td>
                    <td className="px-4 py-2.5 text-sm font-semibold tabular-nums">{fmt(totalActual)}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-sm font-semibold tabular-nums", totalVariance > 0 ? "text-rose-600" : "text-emerald-600")}>
                        {totalVariance > 0 ? "+" : ""}{fmt(totalVariance)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-sm font-semibold tabular-nums", totalVariance > 0 ? "text-rose-600" : "text-emerald-600")}>
                        {totalVariance > 0 ? "+" : ""}{totalBudget > 0 ? ((totalVariance / totalBudget) * 100).toFixed(1) : "0"}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          AI DEPARTMENTAL HEATMAP SECTION
      ══════════════════════════════════════════════════════════════════ */}

      {/* Section divider */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          {isAr ? "رادار الميزانية بالذكاء الاصطناعي (FY 2026)" : "AI Budget Heatmap (FY 2026)"}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* AI KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {isAr ? "إجمالي الميزانية المؤسسية" : "Total Corporate Budget"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums tracking-tighter">{fmt(1_380_000)}</p>
            <p className="text-xs text-muted-foreground mt-1">{isAr ? "السنة المالية 2026" : "FY 2026"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {isAr ? "إجمالي الفعلي حتى الآن" : "Total Actual YTD"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums tracking-tighter">{fmt(337_000)}</p>
            <p className="text-xs text-muted-foreground mt-1">{isAr ? "نهاية فبراير — الربع الأول" : "End of February — Q1"}</p>
          </CardContent>
        </Card>

        {/* AI Alert Card */}
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-xl flex flex-col justify-center gap-1">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest">
              {isAr ? "تنبيه مستشار AI" : "Mustashar AI Alert"}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug">
            {isAr
              ? "التسويق استهلك ١١٥٪ من ميزانيته السنوية. إعادة التخصيص مطلوبة فوراً."
              : "Marketing has consumed 115% of its annual budget. Immediate reallocation required."}
          </p>
        </div>
      </div>

      {/* Departmental heatmap rows */}
      <div className="flex flex-col gap-4">
        {DEPARTMENTS.map((dept) => (
          <DepartmentRow
            key={dept.id}
            dept={dept}
            isAr={isAr}
            onClick={handleDeptClick}
          />
        ))}
      </div>

      {/* Drill-down sheet */}
      <DrillDownSheet
        dept={selectedDept}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isAr={isAr}
        dir={dir as "ltr" | "rtl"}
      />

    </div>
  );
}
