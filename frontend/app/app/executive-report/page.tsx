"use client";

import { useState, useMemo } from "react";
import {
  Printer,
  Download,
  Shield,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  Bot,
  FileText,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { TimeRangeButtons, type TimeRangeKey } from "@/components/charts/TimeRangeButtons";
import { RechartsTooltipGlass } from "@/components/charts/ChartTooltipGlass";

// ── Executive report mock (period-driven) ────────────────────────────────────

const CASH_TREND_FULL = [
  { month: "Sep", monthAr: "سبتمبر", balance: 3200000 },
  { month: "Oct", monthAr: "أكتوبر", balance: 3500000 },
  { month: "Nov", monthAr: "نوفمبر", balance: 3800000 },
  { month: "Dec", monthAr: "ديسمبر", balance: 4100000 },
  { month: "Jan", monthAr: "يناير", balance: 4450000 },
  { month: "Feb", monthAr: "فبراير", balance: 4820000 },
];

const REVENUE_VS_EXPENSES_FULL = [
  { month: "Sep", monthAr: "سبتمبر", revenue: 890000, expenses: 720000 },
  { month: "Oct", monthAr: "أكتوبر", revenue: 950000, expenses: 780000 },
  { month: "Nov", monthAr: "نوفمبر", revenue: 1020000, expenses: 810000 },
  { month: "Dec", monthAr: "ديسمبر", revenue: 1080000, expenses: 850000 },
  { month: "Jan", monthAr: "يناير", revenue: 1100000, expenses: 920000 },
  { month: "Feb", monthAr: "فبراير", revenue: 1230000, expenses: 980000 },
];

function sliceByRange<T>(arr: T[], range: TimeRangeKey): T[] {
  if (range === "3m") return arr.slice(-3);
  if (range === "6m") return arr;
  if (range === "12m" || range === "all") return arr;
  return arr;
}

/** Mock KPIs and narrative for executive report by time range */
function getExecutiveReportMock(range: TimeRangeKey, fmt: (n: number) => string) {
  const slice = sliceByRange(CASH_TREND_FULL, range);
  const openingBalance = slice[0]?.balance ?? 0;
  const closingBalance = slice[slice.length - 1]?.balance ?? 0;
  const netFlow = closingBalance - openingBalance;
  const revSlice = sliceByRange(REVENUE_VS_EXPENSES_FULL, range);
  const totalRevenue = revSlice.reduce((s, r) => s + r.revenue, 0);
  const totalExpenses = revSlice.reduce((s, r) => s + r.expenses, 0);
  const txCount = range === "3m" ? 1240 : range === "6m" ? 2680 : 5200;
  return {
    openingBalance,
    closingBalance,
    netFlow,
    totalRevenue,
    totalExpenses,
    transactionCount: txCount,
    runwayMonths: 8.3,
    healthScore: 82,
    narrativeEn: `Over the selected period, closing balance reached ${fmt(closingBalance)}, with net cash flow of ${netFlow >= 0 ? "+" : ""}${fmt(netFlow)}. Revenue totaled ${fmt(totalRevenue)} and expenses ${fmt(totalExpenses)}; runway remains ${range === "3m" ? "8.2" : "8.3"} months.`,
    narrativeAr: `خلال الفترة المختارة، بلغ الرصيد الختامي ${fmt(closingBalance)}، وصافي التدفق النقدي ${netFlow >= 0 ? "+" : ""}${fmt(netFlow)}. إجمالي الإيرادات ${fmt(totalRevenue)} والمصروفات ${fmt(totalExpenses)}؛ فترة التشغيل ${range === "3m" ? "٨.٢" : "٨.٣"} أشهر.`,
  };
}

interface Entity {
  nameEn: string;
  nameAr: string;
  balance: number;
  revenue: number;
  expenses: number;
  health: number;
  trendDir: "up" | "down" | "flat";
}

const ENTITIES: Entity[] = [
  { nameEn: "Tadfuq HQ", nameAr: "تدفق - المقر الرئيسي", balance: 2100000, revenue: 520000, expenses: 380000, health: 88, trendDir: "up" },
  { nameEn: "Construction LLC", nameAr: "شركة المقاولات ذ.م.م", balance: 1450000, revenue: 410000, expenses: 350000, health: 76, trendDir: "up" },
  { nameEn: "Trading Co.", nameAr: "شركة التجارة", balance: 680000, revenue: 180000, expenses: 150000, health: 72, trendDir: "flat" },
  { nameEn: "Tech Solutions", nameAr: "الحلول التقنية", balance: 420000, revenue: 95000, expenses: 80000, health: 65, trendDir: "up" },
  { nameEn: "Properties", nameAr: "العقارات", balance: 170000, revenue: 25000, expenses: 20000, health: 45, trendDir: "down" },
];

interface Risk {
  severity: "high" | "medium" | "low";
  en: string;
  ar: string;
}

interface RiskData {
  severity: "high" | "medium" | "low";
  amount?: number;
  en: string;
  ar: string;
}

const RISKS: RiskData[] = [
  { severity: "high", amount: 101_000, en: "Payroll + GOSI due in 3 days ({amt}). Ensure funds in payroll account.", ar: "الرواتب + التأمينات مستحقة خلال ٣ أيام ({amt}). تأكد من توفر الأموال في حساب الرواتب." },
  { severity: "medium", amount: 28_000, en: "Overdue receivable {amt} from Supplier X (7 days late). Escalate collection.", ar: "مستحقات متأخرة {amt} من المورد X (متأخرة ٧ أيام). صعّد التحصيل." },
  { severity: "low", en: "USD/SAR rate favorable for FX-denominated contracts. Consider locking rate.", ar: "سعر صرف USD/SAR مناسب للعقود بالعملات الأجنبية. فكّر في تثبيت السعر." },
];

interface AgentSummary {
  nameEn: string;
  nameAr: string;
  emoji: string;
  summaryEn: string;
  summaryAr: string;
}

const AGENTS: AgentSummary[] = [
  { nameEn: "Raqib", nameAr: "رقيب", emoji: "👁️", summaryEn: "12 anomalies detected, 3 critical resolved", summaryAr: "١٢ حالة شاذة مكتشفة، ٣ حرجة تم حلها" },
  { nameEn: "Mutawaqi", nameAr: "متوقّع", emoji: "🔮", summaryEn: "Forecast accuracy 94%, predicted payroll squeeze 5 days early", summaryAr: "دقة التنبؤ ٩٤٪، توقّع ضغط الرواتب قبل ٥ أيام" },
  { nameEn: "Mustashar", nameAr: "مستشار", emoji: "🧠", summaryEn: "8 recommendations, 6 acted upon", summaryAr: "٨ توصيات، ٦ تم تنفيذها" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function healthColor(h: number): string {
  if (h >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (h >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function healthDot(h: number): string {
  if (h >= 75) return "🟢";
  if (h >= 60) return "🟡";
  return "🔴";
}

function severityConfig(s: RiskData["severity"]) {
  if (s === "high") return { dot: "🔴", label: "HIGH", labelAr: "عالي", border: "border-rose-200 dark:border-rose-900/50", bg: "bg-rose-50/50 dark:bg-rose-950/20", text: "text-rose-700 dark:text-rose-400" };
  if (s === "medium") return { dot: "🟡", label: "MEDIUM", labelAr: "متوسط", border: "border-amber-200 dark:border-amber-900/50", bg: "bg-amber-50/50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400" };
  return { dot: "🟢", label: "LOW", labelAr: "منخفض", border: "border-emerald-200 dark:border-emerald-900/50", bg: "bg-emerald-50/50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400" };
}

// ── Tooltip: premium glass (month Arabic, main value, % change, sub line) ─────
function CashTrendTooltipContent({ active, payload, label, fmt, data, isAr }: any) {
  if (!active || !payload?.length || !label) return null;
  const idx = data?.findIndex((d: any) => (d.month === label || d.monthAr === label)) ?? -1;
  const row = idx >= 0 ? data?.[idx] : null;
  const prevBalance = idx > 0 && data?.[idx - 1] ? data[idx - 1].balance : undefined;
  const currBalance = row?.balance;
  const pctChange =
    prevBalance != null && prevBalance !== 0 && currBalance != null
      ? ((currBalance - prevBalance) / prevBalance) * 100
      : undefined;
  const labelFormatted = isAr && row?.monthAr ? `${row.monthAr} 2026` : `${label} 2026`;
  return (
    <RechartsTooltipGlass
      active={active}
      payload={payload}
      label={labelFormatted}
      fmt={fmt}
      pctChange={pctChange}
      mainValue={currBalance}
      isPremium
    />
  );
}

function RevenueExpenseTooltipContent({ active, payload, label, fmt, isAr }: any) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p: any) => p.dataKey === "revenue")?.value ?? 0;
  const expenses = payload.find((p: any) => p.dataKey === "expenses")?.value ?? 0;
  const subLine = isAr
    ? `الإيرادات: ${fmt(revenue)} | المصروفات: ${fmt(expenses)}`
    : `Revenue: ${fmt(revenue)} | Expenses: ${fmt(expenses)}`;
  const labelFormatted = `${label} 2026`;
  return (
    <RechartsTooltipGlass
      active={active}
      payload={payload.map((p: any) => ({
        ...p,
        name: p.dataKey === "revenue" ? (isAr ? "الإيرادات" : "Revenue") : (isAr ? "المصروفات" : "Expenses"),
      }))}
      label={labelFormatted}
      fmt={fmt}
      mainValue={revenue}
      subLine={subLine}
      isPremium
    />
  );
}

// ── Component ────────────────────────────────────────────────────────────────

const PERIOD_LABEL: Record<TimeRangeKey, { en: string; ar: string }> = {
  "3m": { en: "Last 3 Months", ar: "آخر ٣ أشهر" },
  "6m": { en: "Last 6 Months", ar: "آخر ٦ أشهر" },
  "12m": { en: "Last 12 Months", ar: "آخر ١٢ شهر" },
  all: { en: "All", ar: "الكل" },
};

export default function ExecutiveReportPage() {
  const { locale, dir } = useI18n();
  const { fmt } = useCurrency();
  const isAr = locale === "ar";
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("6m");

  const now = new Date();
  const generatedDate = isAr
    ? now.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
    : now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const generatedTime = now.toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });

  const mock = useMemo(() => getExecutiveReportMock(timeRange, fmt), [timeRange, fmt]);
  const cashTrendData = useMemo(
    () => sliceByRange(CASH_TREND_FULL, timeRange).map((d) => ({ ...d, month: isAr ? d.monthAr : d.month })),
    [timeRange, isAr]
  );
  const revExpData = useMemo(
    () => sliceByRange(REVENUE_VS_EXPENSES_FULL, timeRange).map((d) => ({ ...d, month: isAr ? d.monthAr : d.month })),
    [timeRange, isAr]
  );

  const periodLabel = PERIOD_LABEL[timeRange];
  const kpis = useMemo(
    () => [
      { labelEn: "Opening Balance", labelAr: "الرصيد الافتتاحي", value: fmt(mock.openingBalance), change: null, positive: true },
      { labelEn: "Closing Balance", labelAr: "الرصيد الختامي", value: fmt(mock.closingBalance), change: "+8.3%", positive: true },
      { labelEn: "Net Cash Flow", labelAr: "صافي التدفق النقدي", value: (mock.netFlow >= 0 ? "+" : "") + fmt(mock.netFlow), change: null, positive: mock.netFlow >= 0 },
      { labelEn: "Transactions", labelAr: "عدد المعاملات", value: mock.transactionCount.toLocaleString(), change: null, positive: true },
      { labelEn: "Runway", labelAr: "فترة التشغيل", value: isAr ? `${mock.runwayMonths} أشهر` : `${mock.runwayMonths} months`, change: isAr ? "مستقر" : "Stable", positive: true },
      { labelEn: "Health Score", labelAr: "مؤشر الصحة المالية", value: `${mock.healthScore}/100`, change: isAr ? "جيد" : "Good", positive: true },
    ],
    [mock, fmt, isAr]
  );

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          @page { size: A4; margin: 16mm; }
          * { box-shadow: none !important; }
        }
      `}</style>

      <div className="max-w-5xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ═══ 1. REPORT HEADER ═══ */}
        <div className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs font-bold tracking-wider px-3 py-1 border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-400">
                Tadfuq.ai
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {isAr ? "التقرير التنفيذي للخزينة" : "Executive Treasury Report"}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{isAr ? periodLabel.ar : periodLabel.en}</span>
                <span className="hidden sm:inline">·</span>
                <span suppressHydrationWarning>
                  {isAr ? "تاريخ الإصدار:" : "Generated:"} {generatedDate}, {generatedTime}
                </span>
              </div>
              <div className="mt-2 no-print">
                <TimeRangeButtons value={timeRange} onChange={setTimeRange} isAr={isAr} />
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                {isAr ? "طباعة" : "Print"}
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
                <Download className="h-4 w-4" />
                {isAr ? "تحميل PDF" : "Download PDF"}
              </Button>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1.5 text-xs font-medium px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800">
            <Shield className="h-3 w-3" />
            {isAr ? "سري — لاستخدام مجلس الإدارة فقط" : "Confidential — Board Use Only"}
          </Badge>
          <div className="h-px bg-border" />
        </div>

        {/* ═══ 2. EXECUTIVE SUMMARY (Mustashar / ملخص تنفيذي) ───────────────── */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {isAr ? "ملخص تنفيذي" : "Executive Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">
              {isAr ? mock.narrativeAr : mock.narrativeEn}
            </p>
          </CardContent>
        </Card>

        {/* ═══ 3. KPI SUMMARY GRID ═══ */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isAr ? "المؤشرات الرئيسية" : "Key Performance Indicators"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {kpis.map((kpi, i) => (
              <Card key={i} className="border-border/50 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                    {isAr ? kpi.labelAr : kpi.labelEn}
                  </p>
                  <p className="text-lg font-bold tabular-nums tracking-tight">
                    {kpi.value}
                  </p>
                  {kpi.change && (
                    <div className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md mt-1.5",
                      kpi.positive
                        ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
                        : "text-rose-600 bg-rose-500/10 dark:text-rose-400"
                    )}>
                      {kpi.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {kpi.change}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ═══ 4. CASH TREND CHART ═══ */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {isAr ? `اتجاه النقد — ${periodLabel.ar}` : `Cash Trend — ${periodLabel.en}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashTrendData} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<CashTrendTooltipContent fmt={fmt} data={cashTrendData} isAr={isAr} />} cursor={{ fill: "hsl(142 71% 45% / 0.08)", radius: 4 }} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(142 71% 45%)"
                    strokeWidth={2.5}
                    fill="url(#cashGrad)"
                    dot={{ r: 4, fill: "var(--background)", stroke: "hsl(142 71% 45%)", strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ═══ 5. REVENUE VS EXPENSES CHART ═══ */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {isAr ? `الإيرادات مقابل المصروفات — ${periodLabel.ar}` : `Revenue vs Expenses — ${periodLabel.en}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revExpData} margin={{ top: 8, right: 16, left: 16, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<RevenueExpenseTooltipContent fmt={fmt} isAr={isAr} />} cursor={{ fill: "hsl(142 71% 45% / 0.08)", radius: 4 }} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs font-medium">
                        {value === "revenue" ? (isAr ? "الإيرادات" : "Revenue") : (isAr ? "المصروفات" : "Expenses")}
                      </span>
                    )}
                  />
                  <Bar dataKey="revenue" fill="hsl(152 69% 41%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expenses" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ═══ 6. ENTITY PERFORMANCE TABLE ═══ */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {isAr ? "أداء الكيانات" : "Entity Performance"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{isAr ? "الكيان" : "Entity"}</TableHead>
                  <TableHead className="text-xs text-end">{isAr ? "الرصيد" : "Balance"}</TableHead>
                  <TableHead className="text-xs text-end">{isAr ? "الإيرادات" : "Revenue"}</TableHead>
                  <TableHead className="text-xs text-end">{isAr ? "المصروفات" : "Expenses"}</TableHead>
                  <TableHead className="text-xs text-center">{isAr ? "الصحة" : "Health"}</TableHead>
                  <TableHead className="text-xs text-center">{isAr ? "الاتجاه" : "Trend"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ENTITIES.map((e) => (
                  <TableRow key={e.nameEn}>
                    <TableCell className="font-medium text-sm">{isAr ? e.nameAr : e.nameEn}</TableCell>
                    <TableCell className="text-end tabular-nums text-sm">{fmt(e.balance)}</TableCell>
                    <TableCell className="text-end tabular-nums text-sm">{fmt(e.revenue)}</TableCell>
                    <TableCell className="text-end tabular-nums text-sm">{fmt(e.expenses)}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn("font-semibold text-sm", healthColor(e.health))}>
                        {e.health} {healthDot(e.health)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {e.trendDir === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mx-auto" />}
                      {e.trendDir === "down" && <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400 mx-auto" />}
                      {e.trendDir === "flat" && <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ═══ 7. KEY RISKS & RECOMMENDATIONS ═══ */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {isAr ? "المخاطر الرئيسية والتوصيات" : "Key Risks & Recommendations"}
          </h2>
          <div className="space-y-3">
            {RISKS.map((risk, i) => {
              const cfg = severityConfig(risk.severity);
              return (
                <Card key={i} className={cn("border shadow-sm", cfg.border, cfg.bg)}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">{cfg.dot}</span>
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className={cn("text-[10px] font-bold uppercase mb-1.5", cfg.text, cfg.border)}>
                        {isAr ? cfg.labelAr : cfg.label}
                      </Badge>
                      <p className="text-sm leading-relaxed">
                        {risk.amount != null
                          ? (isAr ? risk.ar : risk.en).replace("{amt}", fmt(risk.amount))
                          : (isAr ? risk.ar : risk.en)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ═══ 8. AI AGENTS SUMMARY ═══ */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              {isAr ? "ملخص وكلاء الذكاء الاصطناعي" : "AI Agents Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {AGENTS.map((agent) => (
                <div key={agent.nameEn} className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{agent.emoji}</span>
                    <span className="text-sm font-semibold">{isAr ? agent.nameAr : agent.nameEn}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isAr ? agent.summaryAr : agent.summaryEn}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ═══ 9. REPORT FOOTER ═══ */}
        <div className="border-t border-border pt-6 mt-2 space-y-1 text-center text-xs text-muted-foreground">
          <p className="font-medium">
            {isAr
              ? "تم إنشاء هذا التقرير تلقائيًا بواسطة منصة تدفق للخزينة الذكية"
              : "This report was auto-generated by Tadfuq AI Treasury Platform"}
          </p>
          <p>
            {isAr
              ? "للاستفسارات، تواصل مع treasury@TadFuq.ai"
              : "For questions, contact treasury@TadFuq.ai"}
          </p>
          <p className="text-muted-foreground/60 pt-1">
            {isAr ? "صفحة ١ من ١" : "Page 1 of 1"}
          </p>
        </div>

      </div>
    </div>
  );
}
