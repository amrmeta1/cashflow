"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, RefreshCw, Settings2, Wallet, ArrowUpCircle, TrendingUp, LayoutGrid, X, Eye, EyeOff, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useScenario } from "@/contexts/ScenarioContext";
import { cn } from "@/lib/utils";
import type { CashflowMonthPoint } from "@/components/forecast/MasterForecastChart";
import { ForecastChart } from "@/features/forecast/forecast-chart";
import { useForecast } from "@/lib/hooks/useForecast";
import { getTenantId } from "@/lib/api/client";

const MasterForecastChart = dynamic(
  () => import("@/components/forecast/MasterForecastChart").then((m) => ({ default: m.MasterForecastChart })),
  { ssr: false, loading: () => <Skeleton className="h-[350px] w-full" /> }
);

// ── Mock data ──────────────────────────────────────────────────────────────────

type GridRow = {
  label: string;
  icon: string;
  color: string;
  bold?: boolean;
  muted?: boolean;
  indent?: boolean;
  values: (number | null)[];
};

const CURRENT_MONTH_IDX = 2;

function scenarioTypeLabel(
  type: "delay_payment" | "split_payment" | "accelerate_receivable",
  isAr: boolean
): string {
  const labels: Record<string, { ar: string; en: string }> = {
    delay_payment: { ar: "تأخير الدفع", en: "Delay payment" },
    split_payment: { ar: "تقسيم الدفع", en: "Split payment" },
    accelerate_receivable: { ar: "تسريع التحصيل", en: "Accelerate receivable" },
  };
  const t = labels[type];
  return isAr ? t?.ar ?? type : t?.en ?? type;
}

/** Apply scenario delta to chart balances (Option A: shift monthly view). */
function applyScenarioDeltaToChart(
  data: CashflowMonthPoint[],
  deltaCash: number
): CashflowMonthPoint[] {
  return data.map((point) => {
    const out = { ...point };
    if (point.balance != null) out.balance = point.balance + deltaCash;
    if (point.balanceForecast != null) out.balanceForecast = point.balanceForecast + deltaCash;
    return out;
  });
}

/** Apply scenario delta to balance rows only (Opening + Closing). */
function applyScenarioDeltaToGridRows(rows: GridRow[], deltaCash: number): GridRow[] {
  const openingLabelEn = "Opening Balance";
  const closingLabelEn = "Closing Balance";
  const openingLabelAr = "الرصيد بداية الشهر";
  const closingLabelAr = "الرصيد نهاية الشهر";
  return rows.map((row) => {
    const isBalanceRow =
      row.label === openingLabelEn ||
      row.label === closingLabelEn ||
      row.label === openingLabelAr ||
      row.label === closingLabelAr;
    if (!isBalanceRow) return row;
    return {
      ...row,
      values: row.values.map((v) => (v != null ? v + deltaCash : v)),
    };
  });
}

function getMonths(isAr: boolean): string[] {
  return isAr
    ? ["فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر"]
    : ["February", "March", "April", "May", "June", "July", "August", "September", "October"];
}

function getChartData(isAr: boolean): CashflowMonthPoint[] {
  const m = getMonths(isAr);
  return [
    { month: m[0], inflow: 920_000,  outflow: 710_000,  balance: 2_310_000 },
    { month: m[1], inflow: 1_050_000, outflow: 830_000, balance: 2_530_000 },
    { month: m[2], inflow: 980_000,  outflow: 760_000,  balance: 2_750_000, isCurrent: true },
    { month: m[3], inflowFuture: 1_100_000, outflowFuture: 870_000,  balanceForecast: 2_980_000 },
    { month: m[4], inflowFuture: 1_050_000, outflowFuture: 920_000,  balanceForecast: 3_110_000 },
    { month: m[5], inflowFuture: 1_200_000, outflowFuture: 850_000,  balanceForecast: 3_460_000 },
    { month: m[6], inflowFuture: 1_150_000, outflowFuture: 990_000,  balanceForecast: 3_620_000 },
    { month: m[7], inflowFuture: 1_300_000, outflowFuture: 1_010_000, balanceForecast: 3_910_000 },
    { month: m[8], inflowFuture: 1_250_000, outflowFuture: 960_000,  balanceForecast: 4_200_000 },
  ];
}

function getGridRows(isAr: boolean): GridRow[] {
  return [
    {
      label: isAr ? "الرصيد بداية الشهر" : "Opening Balance",
      icon: "●", color: "text-blue-500", bold: true,
      values: [2_100_000, 2_310_000, 2_530_000, 2_750_000, 2_980_000, 3_110_000, 3_460_000, 3_620_000, 3_910_000],
    },
    {
      label: isAr ? "التدفقات الداخلة" : "Cash Inflows",
      icon: "▲", color: "text-emerald-600", bold: true,
      values: [920_000, 1_050_000, 980_000, 1_100_000, 1_050_000, 1_200_000, 1_150_000, 1_300_000, 1_250_000],
    },
    {
      label: isAr ? "مبيعات التجزئة" : "Retail Sales",
      icon: "", color: "text-muted-foreground", indent: true,
      values: [540_000, 620_000, 580_000, 650_000, 620_000, 710_000, 680_000, 770_000, 740_000],
    },
    {
      label: isAr ? "تحصيل ذمم" : "Receivables",
      icon: "", color: "text-muted-foreground", indent: true,
      values: [380_000, 430_000, 400_000, 450_000, 430_000, 490_000, 470_000, 530_000, 510_000],
    },
    {
      label: isAr ? "التدفقات الخارجة" : "Cash Outflows",
      icon: "▼", color: "text-rose-600", bold: true,
      values: [710_000, 830_000, 760_000, 870_000, 920_000, 850_000, 990_000, 1_010_000, 960_000],
    },
    {
      label: isAr ? "رواتب" : "Salaries",
      icon: "", color: "text-muted-foreground", indent: true,
      values: [320_000, 320_000, 320_000, 320_000, 320_000, 320_000, 320_000, 320_000, 320_000],
    },
    {
      label: isAr ? "موردين" : "Suppliers",
      icon: "", color: "text-muted-foreground", indent: true,
      values: [390_000, 510_000, 440_000, 550_000, 600_000, 530_000, 670_000, 690_000, 640_000],
    },
    {
      label: isAr ? "الرصيد نهاية الشهر" : "Closing Balance",
      icon: "◆", color: "text-foreground", bold: true, muted: true,
      values: [2_310_000, 2_530_000, 2_750_000, 2_980_000, 3_110_000, 3_460_000, 3_620_000, 3_910_000, 4_200_000],
    },
  ];
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
  value, label, dotColor, gradient, icon: Icon,
}: {
  value: string; label: string; dotColor: string; gradient?: string;
  icon: React.ElementType;
}) {
  return (
    <Card className={`shadow-sm border-border/50 overflow-hidden ${gradient ?? ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <p className="text-[11px] text-muted-foreground font-medium leading-none">{label}</p>
        </div>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground leading-none" suppressHydrationWarning>
          {value}
        </p>
        <div className="mt-2 flex justify-end">
          <Icon className="h-4 w-4 text-muted-foreground/40" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ForecastPage() {
  const { locale, dir } = useI18n();
  const { profile } = useCompany();
  void profile;
  const { fmt, fmtAxis, selected: currCode } = useCurrency();
  const {
    scenarios,
    activeScenarioId,
    activeScenario,
    removeScenario,
    setActiveScenario,
    clearAllScenarios,
  } = useScenario();
  const isAr = locale === "ar";
  const tenantId = getTenantId();
  const { data: forecastData, isLoading: forecastLoading, error: forecastError } = useForecast(tenantId);

  const [visibleScenarioIds, setVisibleScenarioIds] = useState<Set<string>>(new Set());
  const prevScenariosLengthRef = useRef(0);
  useEffect(() => {
    if (scenarios.length > prevScenariosLengthRef.current) {
      const added = scenarios.slice(prevScenariosLengthRef.current).map((s) => s.id);
      setVisibleScenarioIds((prev) => {
        const next = new Set(prev);
        added.forEach((id) => next.add(id));
        return next;
      });
    }
    prevScenariosLengthRef.current = scenarios.length;
  }, [scenarios.length, scenarios]);

  const months = getMonths(isAr);
  const baseForecastChartData = useMemo(() => getChartData(isAr), [isAr]);
  const baseForecastGridRows = useMemo(() => getGridRows(isAr), [isAr]);

  const scenarioForecastChartData = useMemo(
    () =>
      activeScenario
        ? applyScenarioDeltaToChart(baseForecastChartData, activeScenario.deltaCash)
        : baseForecastChartData,
    [baseForecastChartData, activeScenario]
  );
  const scenarioForecastGridRows = useMemo(
    () =>
      activeScenario
        ? applyScenarioDeltaToGridRows(baseForecastGridRows, activeScenario.deltaCash)
        : baseForecastGridRows,
    [baseForecastGridRows, activeScenario]
  );

  const chartData = activeScenario ? scenarioForecastChartData : baseForecastChartData;
  const gridRows = activeScenario ? scenarioForecastGridRows : baseForecastGridRows;

  return (
    <div dir={dir} className="flex flex-col gap-5 p-5 md:p-6 overflow-y-auto h-full">

      {/* ══ FILTER BAR ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            isAr ? "كل المشاريع" : "All Projects",
            isAr ? "يناير ← ديسمبر" : "January → December",
            isAr ? "السيناريو الأساسي" : "Base Scenario",
            isAr ? "عرض مجمع" : "Aggregated View",
          ].map((label) => (
            <Button key={label} variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium">
              {label}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            {isAr ? "تحديث الحساب" : "Recalculate"}
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            {isAr ? "خيارات" : "Options"}
          </Button>
        </div>
      </div>

      {/* ══ PRIMARY SCENARIO BANNER ══ */}
      {scenarios.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5">
          <p className="text-sm text-muted-foreground">
            {activeScenario
              ? (isAr ? "الأساس للمقارنة: " : "Primary: ")
                + scenarioTypeLabel(activeScenario.type, isAr)
                + " · "
                + (activeScenario.deltaCash >= 0 ? "+" : "") + fmt(activeScenario.deltaCash)
              : isAr
                ? "لا سيناريو أساسي محدد"
                : "No primary scenario"}
          </p>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={clearAllScenarios}>
            <X className="h-3.5 w-3.5" />
            {isAr ? "مسح الكل" : "Clear all"}
          </Button>
        </div>
      )}

      {/* ══ SCENARIO COMPARISON: Switcher + Chart + Summary ══ */}
      {scenarios.length > 0 && (
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-base font-semibold">
              {isAr ? "مقارنة السيناريوهات" : "Scenario comparison"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {/* Scenario Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={activeScenarioId === null ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setActiveScenario(null)}
              >
                {isAr ? "الأساس" : "Base"}
              </Button>
              {scenarios.map((s, idx) => {
                const letter = ["A", "B", "C"][idx] ?? String(idx + 1);
                const label = isAr ? `السيناريو ${letter}` : `Scenario ${letter}`;
                const visible = visibleScenarioIds.has(s.id);
                const isPrimary = s.id === activeScenarioId;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setVisibleScenarioIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      })}
                      title={visible ? (isAr ? "إخفاء" : "Hide") : (isAr ? "إظهار" : "Show")}
                    >
                      {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant={isPrimary ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setActiveScenario(isPrimary ? null : s.id)}
                      title={isAr ? "تعيين كأساس للمقارنة" : "Set as primary comparison"}
                    >
                      <Star className={cn("h-3.5 w-3.5 mr-1", isPrimary && "fill-current")} />
                      {label}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeScenario(s.id)}
                      title={isAr ? "حذف" : "Delete"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {forecastData && forecastData.forecast.length > 0 ? (
              <ForecastChart
                base={forecastData.forecast.map(p => p.baseline)}
                scenarios={scenarios}
                labels={forecastData.forecast.map(p => isAr ? `أسبوع ${p.week_number}` : `Week ${p.week_number}`)}
                fmt={fmt}
                fmtAxis={fmtAxis}
                isAr={isAr}
                currencyCode={currCode}
                visibleScenarioIds={visibleScenarioIds}
              />
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {forecastLoading 
                    ? (isAr ? "جاري تحميل التنبؤ..." : "Loading forecast...")
                    : forecastError
                    ? (isAr ? "خطأ في تحميل التنبؤ" : "Error loading forecast")
                    : (isAr ? "لا توجد بيانات معاملات. قم برفع كشف حساب بنكي." : "No transaction data. Upload a bank statement.")}
                </p>
              </div>
            )}

            {/* Comparison Summary Card */}
            <div className="grid gap-3 sm:grid-cols-3">
              {scenarios.map((s, idx) => {
                const letter = ["A", "B", "C"][idx] ?? String(idx + 1);
                const title = isAr ? `السيناريو ${letter}` : `Scenario ${letter}`;
                const worstWeek = s.newForecast.length > 0 ? Math.min(...s.newForecast) : 0;
                const isPrimary = s.id === activeScenarioId;
                return (
                  <Card
                    key={s.id}
                    className={cn(
                      "border-border/50",
                      isPrimary && "ring-2 ring-emerald-500/40"
                    )}
                  >
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                        {isPrimary && <Star className="h-3.5 w-3.5 fill-current text-emerald-500" />}
                        {title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1.5 text-xs">
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">{isAr ? "فرق السيولة" : "Delta Cash"}</span>
                        <span className="tabular-nums font-medium" dir="ltr">
                          {s.deltaCash >= 0 ? "+" : ""}{fmt(s.deltaCash)}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">{isAr ? "أقل أسبوع" : "Worst Week Cash"}</span>
                        <span className="tabular-nums font-medium" dir="ltr">{fmt(worstWeek)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">{isAr ? "مستوى المخاطر" : "Risk Level"}</span>
                        <span>{s.riskLevel}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">{isAr ? "الثقة" : "Confidence"}</span>
                        <span className="tabular-nums">{s.confidence}%</span>
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ SPLIT VIEW ══ */}
      <div className="flex flex-col xl:flex-row gap-6 w-full max-w-[1600px] mx-auto">

        {/* ── RIGHT PANE: KPI Sidebar ── */}
        <div className="w-full xl:w-[280px] shrink-0 flex flex-col gap-3">
          <KpiCard
            value={fmt(3_088_421)}
            label={isAr ? "الرصيد النقدي" : "Cash Balance"}
            dotColor="bg-blue-500"
            gradient="bg-gradient-to-br from-blue-50/70 to-transparent dark:from-blue-950/20"
            icon={Wallet}
          />
          <KpiCard
            value={fmt(820_000)}
            label={isAr ? "تسويات" : "Adjustments"}
            dotColor="bg-violet-500"
            icon={ArrowUpCircle}
          />
          <KpiCard
            value={fmt(625_000)}
            label={isAr ? "استثمارات" : "Investments"}
            dotColor="bg-teal-500"
            icon={TrendingUp}
          />
          <KpiCard
            value={fmt(1_497_600)}
            label={isAr ? "الإجمالي" : "Total"}
            dotColor="bg-zinc-500"
            gradient="bg-muted/30"
            icon={LayoutGrid}
          />
        </div>

        {/* ── LEFT PANE: Chart + Grid ── */}
        <div className="flex-1 min-w-0 overflow-hidden border rounded-xl bg-card flex flex-col shadow-sm">

          {/* Chart */}
          <div className="h-auto p-4 border-b relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">
                  {isAr ? "عرض التدفق النقدي الرئيسي" : "Master Cashflow View"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr
                    ? "Master Cashflow View · فبراير — أكتوبر"
                    : "Master Cashflow View · February — October"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: "#34d399" }} />
                  {isAr ? "فعلي" : "Actual"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ border: "2px solid #34d399" }} />
                  {isAr ? "متوقع" : "Forecast"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-5 shrink-0" style={{ borderTop: "2px solid #818cf8" }} />
                  {isAr ? "الرصيد" : "Balance"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-5 shrink-0" style={{ borderTop: "2px dashed #818cf8" }} />
                  {isAr ? "توقع الرصيد" : "Forecast Balance"}
                </span>
              </div>
            </div>
            <MasterForecastChart data={chartData} fmt={fmt} fmtAxis={fmtAxis} currCode={currCode} />
          </div>

          {/* Synced Data Grid */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="sticky right-0 bg-muted/40 z-10 w-[120px] min-w-[120px] max-w-[120px] border-l shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] p-2 text-start">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {isAr ? "البند" : "Item"}
                    </span>
                  </th>
                  {months.map((m, i) => (
                    <th
                      key={m}
                      className={`p-2 text-end text-[11px] font-semibold min-w-[90px] ${
                        i === CURRENT_MONTH_IDX
                          ? "bg-blue-500/5 text-blue-700 dark:text-blue-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {m}
                      {i === CURRENT_MONTH_IDX && (
                        <span className="block text-[9px] font-normal opacity-70">
                          {isAr ? "الشهر الحالي" : "Current Month"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={`border-b transition-colors hover:bg-muted/30 ${row.muted ? "bg-muted/20" : ""}`}
                  >
                    <td className={`sticky right-0 z-10 border-l shadow-[2px_0_4px_-2px_rgba(0,0,0,0.04)] p-2 bg-card w-[120px] min-w-[120px] max-w-[120px] ${row.muted ? "bg-muted/20" : ""}`}>
                      <div className={`flex items-center gap-1.5 ${row.indent ? "ps-5" : ""}`}>
                        {row.icon && (
                          <span className={`text-[10px] shrink-0 ${row.color}`}>{row.icon}</span>
                        )}
                        <span className={`text-[12px] ${row.bold ? "font-semibold" : "font-normal text-muted-foreground"}`}>
                          {row.label}
                        </span>
                      </div>
                    </td>
                    {row.values.map((val, ci) => (
                      <td
                        key={ci}
                        className={`p-2 text-end text-[12px] tabular-nums ${
                          ci === CURRENT_MONTH_IDX ? "bg-blue-500/5" : ""
                        } ${row.bold ? "font-semibold" : "text-muted-foreground"} ${
                          row.color === "text-rose-600"
                          || row.label === "رواتب" || row.label === "Salaries"
                          || row.label === "موردين" || row.label === "Suppliers"
                            ? "text-rose-600 dark:text-rose-400"
                            : row.color === "text-emerald-600"
                            || row.label === "مبيعات التجزئة" || row.label === "Retail Sales"
                            || row.label === "تحصيل ذمم" || row.label === "Receivables"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : ""
                        }`}
                        suppressHydrationWarning
                      >
                        {val == null ? "—" : fmt(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
