"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Boxes, Sparkles, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { chartGridProps, chartXAxisProps, chartYAxisProps, chartTooltipCursor, CHART_TOOLTIP_CLASS } from "@/components/charts/chartStyles";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useMemo } from "react";
import type { Scenario } from "@/contexts/ScenarioContext";
import { useScenarioPlanner } from "@/lib/hooks/useScenarioPlanner";
import { useForecast } from "@/lib/hooks/useForecast";
import { getTenantId } from "@/lib/api/client";
import { ForecastChart } from "@/features/forecast/forecast-chart";
import type { ScenarioAssumptions, ScenarioDerived, ScenarioPreset } from "@/lib/hooks/useScenarioPlanner";
import { getScenarioVsBaseDiff, getScenarioVsBaseDiffRunway } from "@/lib/scenarioDiff";

// ── Explain this scenario (deterministic template, no LLM) ─────────────────────

function getActivePresetKey(
  assumptions: ScenarioAssumptions,
  presets: ScenarioPreset[]
): string | null {
  const match = presets.find(
    (p) =>
      p.assumptions.revenueGrowthPct === assumptions.revenueGrowthPct &&
      p.assumptions.costReductionPct === assumptions.costReductionPct &&
      p.assumptions.collectionSpeedDays === assumptions.collectionSpeedDays
  );
  return match ? match.key : null;
}

function getPresetLabel(key: string, isAr: boolean): string {
  const labels: Record<string, { ar: string; en: string }> = {
    worst: { ar: "الحالة الأسوأ", en: "Worst Case" },
    base: { ar: "الحالة الأساسية", en: "Base Case" },
    best: { ar: "الحالة المثلى", en: "Best Case" },
    lose_client: { ar: "خسارة أكبر عميل", en: "Lose Biggest Client" },
    delayed_collections: { ar: "تأخر التحصيل", en: "Delayed Collections" },
    aggressive_growth: { ar: "نمو عدواني", en: "Aggressive Growth" },
    emergency_cost_cut: { ar: "تقشف طارئ", en: "Emergency Cost Cut" },
  };
  return isAr ? labels[key]?.ar ?? key : labels[key]?.en ?? key;
}

function getScenarioExplanation(
  assumptions: ScenarioAssumptions,
  derived: ScenarioDerived,
  presets: ScenarioPreset[],
  fmt: (n: number) => string,
  isAr: boolean
): string {
  const key = getActivePresetKey(assumptions, presets);
  const scenarioName = key ? getPresetLabel(key, isAr) : (isAr ? "السيناريو المخصص" : "Custom scenario");
  const { netMonthlyFlow, projectedRunwayMonths } = derived;
  const runwayText =
    projectedRunwayMonths === null
      ? (isAr ? "∞ مربح" : "∞ Profitable")
      : (isAr ? `${projectedRunwayMonths.toFixed(1)} شهر` : `${projectedRunwayMonths.toFixed(1)} months`);

  if (isAr) {
    return `في هذا السيناريو (${scenarioName}):\n• نمو الإيرادات = ${assumptions.revenueGrowthPct > 0 ? "+" : ""}${assumptions.revenueGrowthPct}٪.\n• تخفيض التكاليف = ${assumptions.costReductionPct}٪.\n• فترة التحصيل = ${assumptions.collectionSpeedDays} يومًا.\nينتج عن ذلك صافي تدفق شهري قدره ${fmt(netMonthlyFlow)} ورصيد يكفي لمدة ${runwayText}.`;
  }
  return `In this scenario (${scenarioName}):\n• Revenue growth = ${assumptions.revenueGrowthPct > 0 ? "+" : ""}${assumptions.revenueGrowthPct}%.\n• Cost reduction = ${assumptions.costReductionPct}%.\n• Collection period = ${assumptions.collectionSpeedDays} days.\nResult: net monthly flow ${fmt(netMonthlyFlow)}, runway ${runwayText}.`;
}

// ── Quick scenario definitions (Base 0%, Optimistic +20%, Pessimistic -30%) ───

const QUICK_BASE = { revenueGrowthPct: 0, costReductionPct: 0, collectionSpeedDays: 30 } as ScenarioAssumptions;
const QUICK_OPTIMISTIC = { revenueGrowthPct: 20, costReductionPct: 10, collectionSpeedDays: 25 } as ScenarioAssumptions;
const QUICK_PESSIMISTIC = { revenueGrowthPct: -30, costReductionPct: 0, collectionSpeedDays: 45 } as ScenarioAssumptions;

function isQuickMatch(assumptions: ScenarioAssumptions, target: ScenarioAssumptions) {
  return (
    assumptions.revenueGrowthPct === target.revenueGrowthPct &&
    assumptions.costReductionPct === target.costReductionPct &&
    assumptions.collectionSpeedDays === target.collectionSpeedDays
  );
}

// ── Mustashar recommendation text (mock, dynamic by scenario) ─────────────────

function getMustasharRecommendation(
  assumptions: ScenarioAssumptions,
  derived: ScenarioDerived,
  fmt: (n: number) => string,
  isAr: boolean
): string {
  const { revenueGrowthPct, costReductionPct, collectionSpeedDays } = assumptions;
  const { netMonthlyFlow } = derived;

  if (revenueGrowthPct >= 20 && costReductionPct >= 10) {
    return isAr
      ? "في هذا السيناريو، الأداء قوي. نوصي بالاستمرار في خطة النمو والحفاظ على ضبط التكاليف لتعظيم الرصيد النقدي."
      : "In this scenario, performance is strong. We recommend continuing the growth plan and maintaining cost discipline to maximize cash position.";
  }
  if (revenueGrowthPct <= -25) {
    const exampleImpact = 245_000;
    return isAr
      ? `في هذا السيناريو، نوصي بتأجيل دفعات الموردين 15 يوم لتحسين السيولة بـ ${fmt(exampleImpact)}.`
      : `In this scenario, we recommend delaying supplier payments by 15 days to improve liquidity by ${fmt(exampleImpact)}.`;
  }
  if (collectionSpeedDays >= 45) {
    return isAr
      ? "تأخر التحصيل يزيد مخاطر السيولة. نوصي بتفعيل التحصيل المبكر للفواتير الكبرى وإرسال تذكيرات تلقائية للعملاء المتأخرين."
      : "Delayed collections increase liquidity risk. We recommend early collection for large invoices and automated reminders for overdue customers.";
  }
  if (costReductionPct >= 20) {
    return isAr
      ? "تخفيض التكاليف الحالي يعزز المدرج الزمني. نوصي بمراقبة الجودة التشغيلية والحفاظ على مستوى الخدمة لتجنب فقدان الإيرادات."
      : "Current cost reduction strengthens runway. We recommend monitoring operational quality and service levels to avoid revenue loss.";
  }
  return isAr
    ? "بناءً على الافتراضات الحالية، نوصي بمراقبة الرصيد النقدي والتفاوض مع الموردين على آجال إضافية عند الحاجة."
    : "Based on current assumptions, we recommend monitoring cash balance and negotiating extended terms with suppliers when needed.";
}

// ── Chart tooltip (Base + Scenario) ────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label, isAr }: any) {
  const { fmt } = useCurrency();
  if (!active || !payload?.length) return null;
  const baseVal = payload.find((p: any) => p.dataKey === "baseBalance")?.value ?? 0;
  const scenarioVal = payload.find((p: any) => p.dataKey === "cashBalance")?.value ?? 0;
  const diff = scenarioVal - baseVal;
  return (
    <div className={cn(CHART_TOOLTIP_CLASS, "space-y-1.5 text-xs min-w-[180px]")}>
      <p className="font-semibold text-zinc-100 mb-1.5 border-b border-zinc-700 pb-2">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-zinc-400">{isAr ? "الأساس" : "Base"}</span>
        <span className="tabular-nums font-medium text-zinc-200">{fmt(baseVal)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-zinc-400">{isAr ? "السيناريو" : "Scenario"}</span>
        <span className={cn("tabular-nums font-medium", scenarioVal >= 0 ? "text-emerald-400" : "text-rose-400")}>
          {fmt(scenarioVal)}
        </span>
      </div>
      <div className="flex justify-between gap-4 pt-1 border-t border-zinc-700">
        <span className="text-zinc-400">{isAr ? "التأثير" : "Impact"}</span>
        <span className={cn("tabular-nums font-semibold", diff >= 0 ? "text-emerald-400" : "text-rose-400")}>
          {diff >= 0 ? "+" : ""}{fmt(diff)}
        </span>
      </div>
    </div>
  );
}

// ── Implementation summary (Scenario Planner enhancements) ───────────────────
// • Components touched: this file only (scenario-planner/page.tsx).
// • Cash timeline: existing chart card retitled to "تطور الرصيد النقدي في هذا السيناريو";
//   ReferenceArea added to shade below zero (negative cash) in light red.
// • KPI cards: getScenarioVsBaseDiff / getScenarioVsBaseDiffRunway used to show
//   scenario vs base value and diff badge (better/worse/same) on all four cards.
// • Explain box: "ماذا يعني هذا السيناريو؟" card to the right of the chart (desktop),
//   body from getScenarioExplanation(assumptions, derived, presets, fmt, isAr).

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScenarioPlannerPage() {
  const { locale, dir } = useI18n();
  const { fmt, fmtAxis, selected: currCode } = useCurrency();
  const isAr = locale === "ar";
  const tenantId = getTenantId();
  const { data: forecastData, isLoading: forecastLoading } = useForecast(tenantId);

  const forecastChartBase = useMemo(() => 
    forecastData?.forecast.map((d) => d.baseline) ?? [], 
    [forecastData]
  );
  const forecastChartScenarios = useMemo((): Scenario[] => {
    if (!forecastData || forecastData.forecast.length === 0) return [];
    // For now, return empty scenarios - will be populated by slider logic
    return [];
  }, [forecastData]);
  const forecastChartLabels = useMemo(() => 
    forecastData?.forecast.map((d) => isAr ? `أسبوع ${d.week_number}` : `Week ${d.week_number}`) ?? [], 
    [forecastData, isAr]
  );

  const {
    assumptions,
    derived,
    setAssumption,
    applyPreset,
    presets,
    baselineRevenue,
    baselineBurn,
    currentCashBalance,
  } = useScenarioPlanner();

  const { adjustedRevenue, adjustedBurn, netMonthlyFlow, projectedRunwayMonths, chartData } = derived;
  const isProfitable = projectedRunwayMonths === null;
  const isPositiveFlow = netMonthlyFlow >= 0;

  const applyQuickScenario = (a: ScenarioAssumptions) => {
    setAssumption("revenueGrowthPct", a.revenueGrowthPct);
    setAssumption("costReductionPct", a.costReductionPct);
    setAssumption("collectionSpeedDays", a.collectionSpeedDays);
  };

  const baseNetFlow = baselineRevenue - baselineBurn;
  const baseRunwayMonths: number | null =
    baseNetFlow >= 0 ? null : currentCashBalance / Math.abs(baseNetFlow);
  const chartDataWithBase = chartData.map((d, i) => ({
    ...d,
    baseBalance: Math.round(currentCashBalance + baseNetFlow * (i + 1)),
  }));
  const minBalanceInChart = Math.min(
    ...chartDataWithBase.flatMap((d) => [d.baseBalance, d.cashBalance]),
    0
  );
  const negativeAreaY2 = minBalanceInChart < 0 ? minBalanceInChart : undefined;

  const collectionDelayPct = Math.round(((assumptions.collectionSpeedDays - 15) / 45) * 100);

  // Runway color
  const runwayColor =
    isProfitable || (projectedRunwayMonths ?? 0) > 12
      ? "text-emerald-600 dark:text-emerald-400"
      : (projectedRunwayMonths ?? 0) >= 6
      ? "text-amber-600 dark:text-amber-400"
      : "text-destructive";

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── Page title ── */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isAr ? "مخطط سيناريوهات الذكاء الاصطناعي" : "AI What-If Scenario Planner"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "اسحب المتغيرات لمحاكاة تأثيرها الفوري على السيولة والمدرج الزمني."
              : "Drag the sliders to instantly model the impact on your cash runway and balance."}
          </p>
        </div>

        {/* ── Quick scenario buttons (Base / Optimistic / Pessimistic) ── */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant={isQuickMatch(assumptions, QUICK_BASE) ? "default" : "outline"}
            size="default"
            className={cn(
              "gap-2 font-semibold",
              isQuickMatch(assumptions, QUICK_BASE) && "bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            )}
            onClick={() => applyQuickScenario(QUICK_BASE)}
          >
            {isAr ? "الحالة الأساسية (٠٪)" : "Base Case (0%)"}
          </Button>
          <Button
            variant={isQuickMatch(assumptions, QUICK_OPTIMISTIC) ? "default" : "outline"}
            size="default"
            className={cn(
              "gap-2 font-semibold",
              isQuickMatch(assumptions, QUICK_OPTIMISTIC) && "bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            )}
            onClick={() => applyQuickScenario(QUICK_OPTIMISTIC)}
          >
            {isAr ? "متفائل (+٢٠٪)" : "Optimistic (+20%)"}
          </Button>
          <Button
            variant={isQuickMatch(assumptions, QUICK_PESSIMISTIC) ? "default" : "outline"}
            size="default"
            className={cn(
              "gap-2 font-semibold",
              isQuickMatch(assumptions, QUICK_PESSIMISTIC) && "bg-rose-600 hover:bg-rose-700 text-white border-0"
            )}
            onClick={() => applyQuickScenario(QUICK_PESSIMISTIC)}
          >
            {isAr ? "متشائم (-٣٠٪)" : "Pessimistic (-30%)"}
          </Button>
        </div>

        {/* ── More scenario presets ── */}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.key}
              variant={
                assumptions.revenueGrowthPct === preset.assumptions.revenueGrowthPct &&
                assumptions.costReductionPct === preset.assumptions.costReductionPct &&
                assumptions.collectionSpeedDays === preset.assumptions.collectionSpeedDays
                  ? "default"
                  : "outline"
              }
              size="sm"
              className="gap-1.5"
              onClick={() => applyPreset(preset)}
            >
              {preset.emoji} {isAr
                ? preset.key === "worst" ? "الحالة الأسوأ"
                : preset.key === "base" ? "الحالة الأساسية"
                : preset.key === "best" ? "الحالة المثلى"
                : preset.key === "lose_client" ? "خسارة أكبر عميل"
                : preset.key === "delayed_collections" ? "تأخر التحصيل"
                : preset.key === "aggressive_growth" ? "نمو عدواني"
                : preset.key === "emergency_cost_cut" ? "تقشف طارئ"
                : preset.label
                : preset.label}
            </Button>
          ))}
        </div>

        {/* ── Main grid: sliders (left) + KPIs (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Sliders panel ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {isAr ? "متغيرات السيناريو" : "Scenario Assumptions"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-2">

              {/* Slider 1 — Revenue Growth */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <label className="text-sm font-medium">
                    {isAr ? "معدل نمو الإيرادات" : "Revenue Growth Rate"}
                  </label>
                  <motion.span
                    key={assumptions.revenueGrowthPct}
                    initial={{ opacity: 0.7, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "text-base font-bold tabular-nums min-w-[3rem] text-right",
                      assumptions.revenueGrowthPct > 0 ? "text-emerald-600 dark:text-emerald-400"
                      : assumptions.revenueGrowthPct < 0 ? "text-destructive"
                      : "text-foreground"
                    )}
                  >
                    {assumptions.revenueGrowthPct > 0 ? "+" : ""}{assumptions.revenueGrowthPct}%
                  </motion.span>
                </div>
                <Slider
                  min={-20}
                  max={50}
                  step={1}
                  value={[assumptions.revenueGrowthPct]}
                  onValueChange={([v]) => setAssumption("revenueGrowthPct", v)}
                  className="py-1"
                />
                <p className="text-xs text-muted-foreground">
                  {isAr ? "التأثير على الإيرادات الشهرية المعدلة" : "Impact on adjusted monthly revenue"}
                </p>
              </div>

              {/* Slider 2 — Cost Reduction */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <label className="text-sm font-medium">
                    {isAr ? "تخفيض التكاليف" : "Cost Reduction"}
                  </label>
                  <motion.span
                    key={assumptions.costReductionPct}
                    initial={{ opacity: 0.7, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "text-base font-bold tabular-nums min-w-[3rem] text-right",
                      assumptions.costReductionPct > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                    )}
                  >
                    -{assumptions.costReductionPct}%
                  </motion.span>
                </div>
                <Slider
                  min={0}
                  max={40}
                  step={1}
                  value={[assumptions.costReductionPct]}
                  onValueChange={([v]) => setAssumption("costReductionPct", v)}
                  className="py-1"
                />
                <p className="text-xs text-muted-foreground">
                  {isAr ? "تخفيض معدل الحرق الشهري" : "Reduction in monthly burn rate"}
                </p>
              </div>

              {/* Slider 3 — Collection Speed (with delay %) */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <label className="text-sm font-medium">
                    {isAr ? "سرعة التحصيل" : "Collection Speed"}
                  </label>
                  <motion.span
                    key={assumptions.collectionSpeedDays}
                    initial={{ opacity: 0.7, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "text-base font-bold tabular-nums min-w-[4rem] text-right",
                      assumptions.collectionSpeedDays < 30 ? "text-emerald-600 dark:text-emerald-400"
                      : assumptions.collectionSpeedDays > 30 ? "text-amber-600 dark:text-amber-400"
                      : "text-foreground"
                    )}
                  >
                    {assumptions.collectionSpeedDays} {isAr ? "يوم" : "days"}
                    {collectionDelayPct > 0 && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({isAr ? "تأخير" : "delay"} {collectionDelayPct}%)
                      </span>
                    )}
                  </motion.span>
                </div>
                <Slider
                  min={15}
                  max={60}
                  step={1}
                  value={[assumptions.collectionSpeedDays]}
                  onValueChange={([v]) => setAssumption("collectionSpeedDays", v)}
                  className="py-1"
                />
                <p className="text-xs text-muted-foreground">
                  {isAr ? "متوسط أيام تحصيل المستحقات" : "Average days to collect receivables"}
                </p>
              </div>

            </CardContent>
          </Card>

          {/* ── Live KPI panel ── */}
          <div className="grid grid-cols-2 gap-4 content-start">

            {/* KPI 1 — Adjusted Revenue */}
            {(() => {
              const { diff, diffPercent, trend } = getScenarioVsBaseDiff(baselineRevenue, adjustedRevenue, true);
              return (
            <Card className={cn(
              "border-s-4 transition-colors",
              adjustedRevenue > baselineRevenue ? "border-s-emerald-500" : adjustedRevenue < baselineRevenue ? "border-s-destructive" : "border-s-border"
            )}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {isAr ? "الإيرادات الشهرية المعدلة" : "Adj. Monthly Revenue"}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={cn(
                  "text-xl font-bold tabular-nums tracking-tighter",
                  adjustedRevenue > baselineRevenue ? "text-emerald-600 dark:text-emerald-400"
                  : adjustedRevenue < baselineRevenue ? "text-destructive"
                  : "text-foreground"
                )}>
                  {fmt(adjustedRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "الأساس:" : "Baseline:"} {fmt(baselineRevenue)}
                </p>
                {trend !== "same" && (
                  <p className={cn(
                    "text-[11px] font-medium mt-1 tabular-nums",
                    trend === "better" ? "text-emerald-600 dark:text-emerald-400" : trend === "worse" ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {trend === "better"
                      ? isAr ? `أفضل بـ ${fmt(diff)} (${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(0)}%)` : `Better by ${fmt(diff)} (${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(0)}%)`
                      : isAr ? `أسوأ بـ ${fmt(-diff)} (${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(0)}%)` : `Worse by ${fmt(-diff)} (${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(0)}%)`}
                  </p>
                )}
              </CardContent>
            </Card>
              );
            })()}

            {/* KPI 2 — Adjusted Burn (lower is better) */}
            {(() => {
              const { diff, diffPercent, trend } = getScenarioVsBaseDiff(baselineBurn, adjustedBurn, false);
              return (
            <Card className={cn(
              "border-s-4 transition-colors",
              adjustedBurn < baselineBurn ? "border-s-emerald-500" : adjustedBurn > baselineBurn ? "border-s-destructive" : "border-s-border"
            )}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {isAr ? "معدل الحرق الشهري المعدل" : "Adj. Monthly Burn"}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={cn(
                  "text-xl font-bold tabular-nums tracking-tighter",
                  adjustedBurn < baselineBurn ? "text-emerald-600 dark:text-emerald-400"
                  : adjustedBurn > baselineBurn ? "text-destructive"
                  : "text-foreground"
                )}>
                  {fmt(adjustedBurn)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "الأساس:" : "Baseline:"} {fmt(baselineBurn)}
                </p>
                {trend !== "same" && (
                  <p className={cn(
                    "text-[11px] font-medium mt-1 tabular-nums",
                    trend === "better" ? "text-emerald-600 dark:text-emerald-400" : trend === "worse" ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {trend === "better"
                      ? isAr ? `أفضل بـ ${fmt(-diff)} (${diffPercent <= 0 ? "" : "+"}${diffPercent.toFixed(0)}%)` : `Better by ${fmt(-diff)} (${diffPercent <= 0 ? "" : "+"}${diffPercent.toFixed(0)}%)`
                      : isAr ? `أسوأ بـ ${fmt(diff)} (${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(0)}%)` : `Worse by ${fmt(diff)} (${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(0)}%)`}
                  </p>
                )}
              </CardContent>
            </Card>
              );
            })()}

            {/* KPI 3 — Net Monthly Flow */}
            {(() => {
              const { diff, diffPercent, trend } = getScenarioVsBaseDiff(baseNetFlow, netMonthlyFlow, true);
              return (
            <Card className={cn(
              "border-s-4 transition-colors",
              isPositiveFlow ? "border-s-emerald-500" : "border-s-destructive"
            )}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {isAr ? "صافي التدفق الشهري" : "Net Monthly Cash Flow"}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={cn(
                  "text-xl font-bold tabular-nums tracking-tighter",
                  isPositiveFlow ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                )}>
                  {netMonthlyFlow >= 0 ? "+" : ""}{fmt(netMonthlyFlow)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "الأساس:" : "Baseline:"} {fmt(baseNetFlow)}
                </p>
                {trend !== "same" && (
                  <p className={cn(
                    "text-[11px] font-medium mt-1 tabular-nums",
                    trend === "better" ? "text-emerald-600 dark:text-emerald-400" : trend === "worse" ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {trend === "better"
                      ? isAr ? `أفضل بـ ${fmt(diff)} (${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(0)}%)` : `Better by ${fmt(diff)} (${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(0)}%)`
                      : isAr ? `أسوأ بـ ${fmt(-diff)} (${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(0)}%)` : `Worse by ${fmt(-diff)} (${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(0)}%)`}
                  </p>
                )}
              </CardContent>
            </Card>
              );
            })()}

            {/* KPI 4 — Projected Runway */}
            {(() => {
              const { trend, labelKey } = getScenarioVsBaseDiffRunway(baseRunwayMonths, projectedRunwayMonths);
              return (
            <Card className={cn(
              "border-s-4 transition-colors",
              isProfitable || (projectedRunwayMonths ?? 0) > 12
                ? "border-s-emerald-500"
                : (projectedRunwayMonths ?? 0) >= 6
                ? "border-s-amber-500"
                : "border-s-destructive"
            )}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {isAr ? "المدرج الزمني المتوقع" : "Projected Runway"}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={cn("text-xl font-bold tabular-nums tracking-tighter", runwayColor)}>
                  {isProfitable
                    ? (isAr ? "∞ مربح" : "∞ Profitable")
                    : `${(projectedRunwayMonths ?? 0).toFixed(1)} ${isAr ? "شهر" : "months"}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "الأساس:" : "Baseline:"} {baseRunwayMonths == null ? (isAr ? "∞ مربح" : "∞ Profitable") : `${baseRunwayMonths.toFixed(1)} ${isAr ? "شهر" : "months"}`}
                </p>
                {labelKey !== "same" && (
                  <p className={cn(
                    "text-[11px] font-medium mt-1",
                    trend === "better" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  )}>
                    {labelKey === "better" ? (isAr ? "أفضل من الأساس" : "Better than base") : (isAr ? "أسوأ من الأساس" : "Worse than base")}
                  </p>
                )}
              </CardContent>
            </Card>
              );
            })()}

          </div>
        </div>

        {/* ── Cash timeline (Base vs Scenario) + Explain box ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="min-w-0"
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "تطور الرصيد النقدي في هذا السيناريو" : "Cash balance in this scenario"}
                </CardTitle>
                <Badge variant="secondary" className="gap-1 font-normal text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  {isAr ? "معاينة حية" : "Live Preview"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 border-t-2 border-dashed border-muted-foreground/60" />
                  {isAr ? "التوقّع الأساسي" : "Base Forecast"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-5 border-t-2 border-2"
                    style={{ borderColor: isPositiveFlow ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}
                  />
                  {isAr ? "تأثير السيناريو" : "Scenario Impact"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDataWithBase} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scenarioGreenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="scenarioRedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0 72% 51%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid {...chartGridProps} />

                    <XAxis dataKey="month" {...chartXAxisProps} />
                    <YAxis {...chartYAxisProps} width={60} tickFormatter={fmtAxis} />

                    <Tooltip content={<ChartTooltipContent isAr={isAr} />} cursor={chartTooltipCursor} />

                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(value) => (value === "baseBalance" ? (isAr ? "التوقّع الأساسي" : "Base Forecast") : (isAr ? "تأثير السيناريو" : "Scenario Impact"))}
                    />

                    {negativeAreaY2 !== undefined && (
                      <ReferenceArea
                        y1={0}
                        y2={negativeAreaY2}
                        fill="rgba(239,68,68,0.15)"
                        strokeOpacity={0}
                      />
                    )}
                    <ReferenceLine
                      y={0}
                      stroke="hsl(0 72% 51%)"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <ReferenceLine
                      y={currentCashBalance}
                      stroke="hsl(240 3.8% 46.1%)"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{
                        value: isAr ? "الأساس" : "Baseline",
                        position: "insideTopRight",
                        fontSize: 10,
                        fill: "hsl(240 3.8% 46.1%)",
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="baseBalance"
                      name="baseBalance"
                      stroke="hsl(240 3.8% 46.1%)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cashBalance"
                      name="cashBalance"
                      stroke={isPositiveFlow ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)"}
                      strokeWidth={2}
                      fill={isPositiveFlow ? "url(#scenarioGreenGradient)" : "url(#scenarioRedGradient)"}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

          {/* ── Explain this scenario (deterministic summary) ── */}
          <Card className="shrink-0 border-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                {isAr ? "ماذا يعني هذا السيناريو؟" : "What does this scenario mean?"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                {getScenarioExplanation(assumptions, derived, presets, fmt, isAr)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Mustashar recommendation card ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 to-background dark:from-emerald-950/20 dark:to-background">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {isAr ? "Mustashar يوصي" : "Mustashar Recommends"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {isAr ? "توصية مبنية على السيناريو الحالي" : "Recommendation based on current scenario"}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground">
                {getMustasharRecommendation(assumptions, derived, fmt, isAr)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

      {/* ── Section divider ── */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Boxes className="h-3 w-3" />
            {isAr ? "محاكي الصدمات المالية" : "Financial Stress Simulator"}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* ── Stress simulator: chart + sandbox ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* Base vs Simulated chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "الأساسي مقابل المحاكاة (يومياً)" : "Base vs Simulated Cash Balance (Daily)"}
                </CardTitle>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 border-t-2 border-dashed border-muted-foreground/50" />
                    {isAr ? "الأساسي" : "Base"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 border-t-2 border-primary" />
                    {isAr ? "المحاكاة" : "Simulated"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ForecastChart
                base={forecastChartBase}
                scenarios={forecastChartScenarios}
                labels={forecastChartLabels}
                fmt={fmt}
                fmtAxis={fmtAxis}
                isAr={isAr}
                currencyCode={currCode}
              />
            </CardContent>
          </Card>

          {/* Empty state or loading */}
          {forecastLoading && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {isAr ? "جاري تحميل التنبؤ..." : "Loading forecast..."}
                </p>
              </CardContent>
            </Card>
          )}
          {!forecastLoading && (!forecastData || forecastData.forecast.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {isAr 
                    ? "لا توجد بيانات معاملات. قم برفع كشف حساب بنكي لرؤية التنبؤات."
                    : "No transaction data. Upload a bank statement to see forecasts."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
