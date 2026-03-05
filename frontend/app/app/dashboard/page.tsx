"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Building2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Newspaper,
  CalendarDays,
  Boxes,
  BarChart3,
  AlertTriangle,
  Zap,
  Activity,
  Timer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useEntity, ENTITIES } from "@/contexts/EntityContext";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useCashPosition } from "@/lib/hooks/useCashPosition";
import { useAnalysis } from "@/lib/hooks/useAnalysis";
import { useDemo } from "@/contexts/DemoContext";
import { useTransactions } from "@/features/transactions/hooks";
import type { Transaction } from "@/features/transactions/types";
import { Amt } from "@/components/ui/amt";
import { exportToCSV, formatForExport } from "@/lib/export";
import { DashboardRightSidebar } from "@/components/dashboard/DashboardRightSidebar";
import { RechartsTooltipGlass } from "@/components/charts/ChartTooltipGlass";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { BankAccountsList } from "@/components/dashboard/BankAccountsList";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { chartGridProps, chartXAxisProps, chartTooltipCursor } from "@/components/charts/chartStyles";
import type { CashEvolutionPoint } from "@/components/dashboard/CashEvolutionChart";
import { cn } from "@/lib/utils";

const CashFlowChart = dynamic(
  () => import("@/components/dashboard/CashFlowChart"),
  { ssr: false, loading: () => <Skeleton className="h-[430px] w-full rounded-xl" /> }
);

const CashEvolutionChart = dynamic(
  () => import("@/components/dashboard/CashEvolutionChart").then((m) => m.default),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> }
);

const VISIBLE_ACCOUNTS = 2;
const HEALTH_SCORE = 82;
const BASE_TOTAL_FALLBACK = 218_340;

const FORECAST_7D_BASE = [
  { day: "Mon", dayAr: "اثنين", balance: 218340 },
  { day: "Tue", dayAr: "ثلاثاء", balance: 241340 },
  { day: "Wed", dayAr: "أربعاء", balance: 238140 },
  { day: "Thu", dayAr: "خميس", balance: 245640 },
  { day: "Fri", dayAr: "جمعة", balance: 245640 },
  { day: "Sat", dayAr: "سبت", balance: 253140 },
  { day: "Sun", dayAr: "أحد", balance: 268000 },
];

interface RecentTx {
  id: string;
  descEn: string;
  descAr: string;
  amount: number;
  type: "inflow" | "outflow";
  time: string;
  timeAr: string;
}

const RECENT_TX_FALLBACK: RecentTx[] = [
  { id: "1", descEn: "Client B payment received", descAr: "دفعة العميل ب", amount: 67000, type: "inflow", time: "2h ago", timeAr: "منذ ٢ س" },
  { id: "2", descEn: "Ooredoo auto-debit", descAr: "خصم أوريدو التلقائي", amount: 3200, type: "outflow", time: "5h ago", timeAr: "منذ ٥ س" },
  { id: "3", descEn: "Service revenue - Project Alpha", descAr: "إيراد خدمات - مشروع ألفا", amount: 23000, type: "inflow", time: "1d ago", timeAr: "منذ يوم" },
  { id: "4", descEn: "Office rent payment", descAr: "دفع إيجار المكتب", amount: 15000, type: "outflow", time: "2d ago", timeAr: "منذ ٢ أيام" },
  { id: "5", descEn: "Client A invoice payment", descAr: "دفعة فاتورة العميل أ", amount: 45000, type: "inflow", time: "3d ago", timeAr: "منذ ٣ أيام" },
];

function relativeTime(dateStr: string, isAr: boolean): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return isAr ? "اليوم" : "Today";
  if (diffDays === 1) return isAr ? "أمس" : "Yesterday";
  if (diffDays < 7) return isAr ? `منذ ${diffDays} أيام` : `${diffDays}d ago`;
  if (diffDays < 30) return isAr ? `منذ ${Math.floor(diffDays / 7)} أسبوع` : `${Math.floor(diffDays / 7)}w ago`;
  return isAr ? `منذ ${Math.floor(diffDays / 30)} شهر` : `${Math.floor(diffDays / 30)}mo ago`;
}

function transactionToRecentTx(t: Transaction, isAr: boolean): RecentTx {
  const desc = t.description || t.counterparty?.name || "—";
  return {
    id: t.id,
    descEn: desc,
    descAr: desc,
    amount: Math.abs(t.amount),
    type: t.amount >= 0 ? "inflow" : "outflow",
    time: relativeTime(t.txn_date || t.created_at, false),
    timeAr: relativeTime(t.txn_date || t.created_at, true),
  };
}

interface UpcomingPmt {
  id: string;
  descEn: string;
  descAr: string;
  amount: number;
  daysUntil: number;
  severity: "danger" | "warning" | "normal";
}

const UPCOMING: UpcomingPmt[] = [
  { id: "1", descEn: "Payroll - All Staff", descAr: "رواتب الموظفين", amount: 89000, daysUntil: 3, severity: "danger" },
  { id: "2", descEn: "GOSI / Social Insurance", descAr: "التأمينات الاجتماعية", amount: 12000, daysUntil: 3, severity: "warning" },
  { id: "3", descEn: "Supplier X - Materials", descAr: "المورد X - مواد", amount: 28000, daysUntil: 7, severity: "normal" },
  { id: "4", descEn: "VAT Filing Q1", descAr: "إقرار ضريبة Q1", amount: 18500, daysUntil: 12, severity: "normal" },
];

const STORAGE_KEY = "dashboard-visible-sections";

interface SectionVisibility {
  kpi: boolean;
  chart: boolean;
  cashEvolution: boolean;
  banks: boolean;
  forecast: boolean;
  activity: boolean;
  upcoming: boolean;
  performance: boolean;
}

const DEFAULT_VISIBILITY: SectionVisibility = {
  kpi: true, chart: true, cashEvolution: true, banks: true,
  forecast: true, activity: true, upcoming: true, performance: true,
};

function loadVisibility(): SectionVisibility {
  if (typeof window === "undefined") return DEFAULT_VISIBILITY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_VISIBILITY, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_VISIBILITY;
}

function ForecastTooltip({ active, payload, label, fmt, forecastData, isAr }: any) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value);
  const idx = forecastData?.findIndex((d: any) => d.day === label) ?? -1;
  const prevBalance = idx > 0 && forecastData?.[idx - 1] ? Number(forecastData[idx - 1].balance) : undefined;
  const pctChange =
    prevBalance != null && prevBalance !== 0
      ? ((value - prevBalance) / prevBalance) * 100
      : undefined;
  const labelFormatted = isAr ? `${label} · 2026` : `${label} · 2026`;
  return (
    <RechartsTooltipGlass
      active={active}
      payload={[{ name: isAr ? "الرصيد" : "Balance", value, color: "hsl(239 84% 67%)", dataKey: "balance" }]}
      label={labelFormatted}
      fmt={fmt}
      pctChange={pctChange}
      mainValue={value}
      isPremium
    />
  );
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Default dashboard date range: 6 months ago to today */
function defaultDateRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 5, 1);
  return { from, to };
}

/** Mock KPIs for a given date range and entity (prorate from base values) */
function getMockKpisForRange(
  dateRange: { from: Date; to: Date },
  entityTotalBalance: number
): { balance: number; revenue: number; expenses: number; runwayMonths: number } {
  const months = Math.max(1, (dateRange.to.getFullYear() - dateRange.from.getFullYear()) * 12 + (dateRange.to.getMonth() - dateRange.from.getMonth()) + 1);
  const scale = months / 6;
  return {
    balance: entityTotalBalance,
    revenue: Math.round(112000 * scale),
    expenses: Math.round(79000 * scale),
    runwayMonths: 8.3,
  };
}

const RECENT_TX_LIMIT = 7;

/** Deterministic mock data for Cash Evolution chart: Oct 2024 → Sep 2025 */
function getCashEvolutionMockData(isAr: boolean): CashEvolutionPoint[] {
  const months: { short: string; en: string; ar: string }[] = [
    { short: "OCT 24", en: "October", ar: "أكتوبر" },
    { short: "NOV 24", en: "November", ar: "نوفمبر" },
    { short: "DEC 24", en: "December", ar: "ديسمبر" },
    { short: "JAN 25", en: "January", ar: "يناير" },
    { short: "FEB 25", en: "February", ar: "فبراير" },
    { short: "MAR 25", en: "March", ar: "مارس" },
    { short: "APR 25", en: "April", ar: "أبريل" },
    { short: "MAY 25", en: "May", ar: "مايو" },
    { short: "JUN 25", en: "June", ar: "يونيو" },
    { short: "JUL 25", en: "July", ar: "يوليو" },
    { short: "AUG 25", en: "August", ar: "أغسطس" },
    { short: "SEP 25", en: "September", ar: "سبتمبر" },
  ];
  const years = [2024, 2024, 2024, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025];
  const inflowBase = [7_116_591, 8_200_000, 6_500_000, 9_100_000, 8_800_000, 9_439_436, 8_900_000, 9_500_000, 8_200_000, 9_800_000, 8_500_000, 9_200_000];
  const outflowBase = [5_200_000, 6_100_000, 7_800_000, 5_900_000, 6_200_000, 4_754_000, 6_500_000, 6_800_000, 5_900_000, 7_100_000, 6_300_000, 6_600_000];
  const out: CashEvolutionPoint[] = [];
  let startBalance = 12_982_961;
  for (let i = 0; i < months.length; i++) {
    const inflow = inflowBase[i];
    const outflow = outflowBase[i];
    const endBalance = startBalance + inflow - outflow;
    const netChange = endBalance - startBalance;
    const investments = Math.round(endBalance * 0.028);
    const totalEnd = endBalance + investments;
    const inflowGap = Math.round(inflow * 0.97);
    const outflowGap = Math.round(outflow * 1.76);
    out.push({
      month: isAr ? months[i].ar : months[i].en,
      monthShort: months[i].short,
      year: years[i],
      balance: endBalance,
      startBalance,
      endBalance,
      netChange,
      investments,
      totalEnd,
      inflowExpected: inflow,
      inflowGap,
      outflowExpected: outflow,
      outflowGap,
    });
    startBalance = endBalance;
  }
  return out;
}

export default function DashboardPage() {
  const { locale, dir, t } = useI18n();
  const d = t.dashboard;
  const { profile } = useCompany();
  const { fmt, fmtDual, fmtAxis, selected: currCode } = useCurrency();
  const { selectedId } = useEntity();
  const { currentTenant } = useTenant();
  const { data: cashData, totalBalance: cashTotal, isLoading: cashLoading } = useCashPosition(currentTenant?.id);
  const { data: analysisData, isNotFound: analysisNotFound } = useAnalysis(currentTenant?.id);
  const demo = useDemo();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions(currentTenant?.id, {});
  const curr = currCode;
  const companyName = profile.companyName || (locale === "ar" ? "شركتك" : "your company");
  const isAr = locale === "ar";
  const transactionsHref = demo.isDemoMode ? `/demo/${demo.slug}/transactions` : "/app/transactions";

  const recentTxList: RecentTx[] =
    transactions.length > 0
      ? transactions.slice(0, RECENT_TX_LIMIT).map((tx) => transactionToRecentTx(tx, isAr))
      : RECENT_TX_FALLBACK;

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => defaultDateRange());
  const [dateFromInput, setDateFromInput] = useState(() => toDateOnly(defaultDateRange().from));
  const [dateToInput, setDateToInput] = useState(() => toDateOnly(defaultDateRange().to));
  const [showAllAccounts, setShowAllAccounts] = useState(false);

  const applyDateFilter = useCallback(() => {
    const from = parseDateOnly(dateFromInput);
    const to = parseDateOnly(dateToInput);
    if (from <= to) setDateRange({ from, to });
  }, [dateFromInput, dateToInput]);

  const TOTAL_BANK = cashTotal ?? 0;
  const bankAccountsFromApi = (cashData?.accounts ?? []).map((a) => ({
    nameEn: a.name,
    nameAr: a.name,
    balance: a.balance,
    share: TOTAL_BANK > 0 ? a.balance / TOTAL_BANK : 0,
  }));
  const visibleAccounts = showAllAccounts ? bankAccountsFromApi : bankAccountsFromApi.slice(0, VISIBLE_ACCOUNTS);
  const hasMore = bankAccountsFromApi.length > VISIBLE_ACCOUNTS;

  const mockKpis = getMockKpisForRange(dateRange, TOTAL_BANK);
  const forecastScale = TOTAL_BANK > 0 ? TOTAL_BANK / BASE_TOTAL_FALLBACK : 1;
  const FORECAST_7D = FORECAST_7D_BASE.map((row) => ({
    ...row,
    balance: Math.round(row.balance * forecastScale),
  }));

  const handleExportCSV = useCallback(() => {
    const kpiData = [
      { [isAr ? "المؤشر" : "Metric"]: isAr ? "إجمالي الرصيد" : "Total Balance", [isAr ? "القيمة" : "Value"]: formatForExport(TOTAL_BANK, locale), [isAr ? "العملة" : "Currency"]: curr, [isAr ? "التغيير" : "Change"]: "+2.1%" },
      { [isAr ? "المؤشر" : "Metric"]: isAr ? "إجمالي الإيرادات" : "Total Revenue", [isAr ? "القيمة" : "Value"]: formatForExport(112000, locale), [isAr ? "العملة" : "Currency"]: curr, [isAr ? "التغيير" : "Change"]: "+12%" },
      { [isAr ? "المؤشر" : "Metric"]: isAr ? "إجمالي المصروفات" : "Total Expenses", [isAr ? "القيمة" : "Value"]: formatForExport(79000, locale), [isAr ? "العملة" : "Currency"]: curr, [isAr ? "التغيير" : "Change"]: "-3.1%" },
      { [isAr ? "المؤشر" : "Metric"]: isAr ? "فترة التشغيل" : "Runway", [isAr ? "القيمة" : "Value"]: "8.3", [isAr ? "العملة" : "Currency"]: isAr ? "أشهر" : "months", [isAr ? "التغيير" : "Change"]: isAr ? "مستقر" : "Stable" },
      ...bankAccountsFromApi.map((acc) => ({ [isAr ? "المؤشر" : "Metric"]: isAr ? acc.nameAr : acc.nameEn, [isAr ? "القيمة" : "Value"]: formatForExport(acc.balance, locale), [isAr ? "العملة" : "Currency"]: curr, [isAr ? "التغيير" : "Change"]: `${(acc.share * 100).toFixed(0)}%` })),
    ];
    exportToCSV(kpiData, `dashboard-report-${new Date().toISOString().slice(0, 10)}`);
  }, [isAr, TOTAL_BANK, locale, curr, bankAccountsFromApi]);

  const [sections, setSections] = useState<SectionVisibility>(DEFAULT_VISIBILITY);
  useEffect(() => { setSections(loadVisibility()); }, []);
  const toggleSection = useCallback((key: keyof SectionVisibility) => {
    setSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleShowAllAccounts = useCallback(() => {
    setShowAllAccounts((prev) => !prev);
  }, []);

  const forecastData = FORECAST_7D.map((d_) => ({ ...d_, day: isAr ? d_.dayAr : d_.day }));
  const forecastEnd = FORECAST_7D[FORECAST_7D.length - 1].balance;
  const forecastChange = forecastEnd - TOTAL_BANK;

  return (
    <div dir={dir} className="flex flex-col xl:flex-row gap-5 p-5 md:p-6 overflow-y-auto h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">

      {/* ═══ WELCOME BANNER ═══ */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-emerald-50/50 dark:from-indigo-950/20 dark:via-background dark:to-emerald-950/10 border border-border/50 p-5 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">
              {d.overviewOf} {companyName}
            </p>
            <h1 suppressHydrationWarning className="text-xl md:text-2xl font-bold tracking-tight">
              {d.greeting}, Adam
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{d.last6Months} · {d.trialData}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
              HEALTH_SCORE >= 80
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
            )}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {d.healthScore}: {HEALTH_SCORE}/100
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" />
              {d.exportReport}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {d.customize}
                </Button>
              </SheetTrigger>
              <SheetContent side={isAr ? "left" : "right"}>
                <SheetHeader>
                  <SheetTitle>{d.customize}</SheetTitle>
                  <SheetDescription>{d.customizeDesc}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 p-6">
                  {([
                    { key: "kpi" as const, label: d.sectionKpi },
                    { key: "chart" as const, label: d.sectionChart },
                    { key: "cashEvolution" as const, label: d.sectionCashEvolution },
                    { key: "forecast" as const, label: d.sectionForecast },
                    { key: "banks" as const, label: d.sectionBanks },
                    { key: "activity" as const, label: d.sectionActivity },
                    { key: "upcoming" as const, label: d.sectionUpcoming },
                    { key: "performance" as const, label: d.sectionPerformance },
                  ]).map((item) => (
                    <label key={item.key} className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-medium">{item.label}</span>
                      <Switch checked={sections[item.key]} onCheckedChange={() => toggleSection(item.key)} />
                    </label>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Link href="/app/daily-brief">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 bg-white/60 dark:bg-background/60">
              <Newspaper className="h-3.5 w-3.5" /> {d.viewBrief}
            </Button>
          </Link>
          <Link href="/app/cash-calendar">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 bg-white/60 dark:bg-background/60">
              <CalendarDays className="h-3.5 w-3.5" /> {d.viewCalendar}
            </Button>
          </Link>
          <Link href="/app/scenario-planner">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 bg-white/60 dark:bg-background/60">
              <Boxes className="h-3.5 w-3.5" /> {d.viewScenario}
            </Button>
          </Link>
          <Link href="/app/benchmark">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 bg-white/60 dark:bg-background/60">
              <BarChart3 className="h-3.5 w-3.5" /> {d.viewBenchmark}
            </Button>
          </Link>
        </div>
      </div>

      {/* ═══ Unified date + entity filter ═══ */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-muted/30 dark:bg-muted/10 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">{d.filterByDate}</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground whitespace-nowrap">{d.dateFrom}</span>
            <input
              type="date"
              value={dateFromInput}
              onChange={(e) => setDateFromInput(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground whitespace-nowrap">{d.dateTo}</span>
            <input
              type="date"
              value={dateToInput}
              onChange={(e) => setDateToInput(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <Button type="button" size="sm" variant="default" className="h-8 text-xs" onClick={applyDateFilter}>
            {d.apply}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-s border-border ps-3 ms-1">
          <Building2 className="h-3.5 w-3.5" />
          <span>{d.entity}:</span>
          <span className="font-medium text-foreground">
            {selectedId === "consolidated"
              ? (isAr ? "الموحّد" : "Consolidated")
              : (isAr ? ENTITIES.find((e) => e.id === selectedId)?.nameAr : ENTITIES.find((e) => e.id === selectedId)?.nameEn) ?? selectedId}
          </span>
        </div>
      </div>

      {/* ═══ KPI STRIP + Latest financial analysis (same row, always visible) ═══ */}
      <div className={cn(
        "grid gap-3",
        sections.kpi ? "grid-cols-2 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {sections.kpi && (
          <>
            <KpiCard
              label={d.totalBalance}
              value={fmt(mockKpis.balance)}
              subtitle={d.across3Accounts}
              change={{ value: "+2.1%", trend: "up", icon: ArrowUpRight }}
              dotColor="bg-zinc-400"
              gradient="bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20"
            />
            <KpiCard
              label={d.totalRevenue}
              value={`${curr} ${mockKpis.revenue.toLocaleString()}`}
              subtitle={d.thisMonth}
              change={{ value: "+12%", trend: "up", icon: ArrowUpRight }}
              dotColor="bg-emerald-500"
            />
            <KpiCard
              label={d.totalExpenses}
              value={`${curr} ${mockKpis.expenses.toLocaleString()}`}
              subtitle={d.topBurn}
              change={{ value: "-3.1%", trend: "down", icon: ArrowDownRight }}
              dotColor="bg-rose-500"
            />
            <KpiCard
              label={d.runway}
              value={`${mockKpis.runwayMonths} ${d.runwayMonths}`}
              subtitle={d.basedOnBurnRate}
              change={{ value: d.stable, trend: "neutral", icon: ArrowUpRight }}
              dotColor="bg-indigo-500"
              gradient="bg-muted/20"
            />
          </>
        )}

        {/* 📊 آخر تحليل مالي — always visible in same row as KPIs */}
        <Card className="shadow-sm border-border/50 overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {isAr ? "آخر تحليل مالي" : "Latest financial analysis"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {analysisData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{isAr ? "الصحة المالية:" : "Financial health:"}</span>
                  <span className={cn(
                    "font-semibold tabular-nums flex items-center gap-1",
                    analysisData.summary.risk_level === "healthy"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : analysisData.summary.risk_level === "warning"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                  )}>
                    {analysisData.summary.health_score}/100
                    {analysisData.summary.risk_level === "healthy" ? " ✓" : " ⚠"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{isAr ? "الرصيد يكفي:" : "Runway:"}</span>
                  <span className="font-medium tabular-nums">{analysisData.liquidity.runway_days} {isAr ? "يوم" : "days"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{isAr ? "المشاكل:" : "Issues:"}</span>
                  <span className="font-medium tabular-nums">{analysisData.summary.total_problems}</span>
                </div>
                <Link href={demo.isDemoMode ? `/demo/${demo.slug}/analysis` : "/app/analysis"}>
                  <Button variant="outline" size="sm" className="w-full mt-2 gap-1.5 text-xs border-emerald-500/50 hover:bg-emerald-500/10">
                    {isAr ? "التفاصيل" : "Details"}
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-2">
                <p className="mb-2">{isAr ? "لا يوجد تحليل بعد" : "No analysis yet"}</p>
                <Link href={demo.isDemoMode ? `/demo/${demo.slug}/analysis` : "/app/analysis"}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs border-emerald-500/50 hover:bg-emerald-500/10">
                    {isAr ? "التفاصيل" : "Details"}
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ MAIN CHART + 7-DAY FORECAST ═══ */}
      <div className="grid grid-cols-1 gap-5">
        {sections.chart && (
          <Card className="shadow-sm border-border/50 p-1">
            <CashFlowChart currency={curr} dateRange={dateRange} />
          </Card>
        )}
        {sections.cashEvolution && (
          <Card className="shadow-sm border-border/50 p-4">
            <CardHeader className="pb-2 pt-1 px-0">
              <CardTitle className="text-sm font-semibold">{d.sectionCashEvolution}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 pt-0">
              <CashEvolutionChart
                data={getCashEvolutionMockData(isAr)}
                currency={curr}
                fmt={fmt}
                isAr={isAr}
              />
            </CardContent>
          </Card>
        )}
        {sections.forecast && (
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  <CardTitle className="text-sm font-semibold">{d.next7Days}</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px]">87% {d.forecastConfidence}</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(239 84% 67%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(239 84% 67%)" stopOpacity={0.02} />
                      </linearGradient>
                      <filter id="forecastGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis dataKey="day" {...chartXAxisProps} />
                    <YAxis hide domain={["dataMin - 10000", "dataMax + 10000"]} />
                    <Tooltip content={<ForecastTooltip fmt={fmt} forecastData={forecastData} isAr={isAr} />} cursor={chartTooltipCursor} />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="hsl(239 84% 67%)"
                      strokeWidth={2}
                      fill="url(#forecastGrad)"
                      dot={{ r: 3, fill: "var(--background)", stroke: "hsl(239 84% 67%)", strokeWidth: 2 }}
                      activeDot={(props: any) => {
                        const { cx, cy } = props;
                        return (
                          <g>
                            <circle cx={cx} cy={cy} r={9} fill="hsl(239 84% 67%)" opacity={0.4} filter="url(#forecastGlow)" />
                            <circle cx={cx} cy={cy} r={6} fill="hsl(239 84% 67%)" stroke="var(--background)" strokeWidth={2} />
                          </g>
                        );
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between px-3 pt-2 border-t border-border/50">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{isAr ? "الرصيد المتوقع" : "Projected"}</p>
                  <p className="text-sm font-bold tabular-nums">{curr} {forecastEnd.toLocaleString()}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md",
                  forecastChange >= 0 ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
                )}>
                  {forecastChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {forecastChange >= 0 ? "+" : ""}{curr} {forecastChange.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ═══ MIDDLE ROW: Performance + Banks + Upcoming ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Performance Metrics */}
        {sections.performance && (
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{d.performance}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {/* DSO */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{d.dso}</span>
                  <span className="text-sm font-bold tabular-nums">32 {d.dsoDays}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: "35%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isAr ? "متوسط القطاع: ٤٥ يوم" : "Industry avg: 45 days"}</p>
              </div>
              {/* Collection Rate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{d.collectionRate}</span>
                  <span className="text-sm font-bold tabular-nums text-emerald-600">85%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: "85%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isAr ? "متوسط القطاع: ٧٢٪" : "Industry avg: 72%"}</p>
              </div>
              {/* Burn Multiple */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{d.burnMultiple}</span>
                  <span className="text-sm font-bold tabular-nums">0.71x</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: "71%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isAr ? "هدف: أقل من ١x" : "Target: below 1x"}</p>
              </div>
              {/* Net Cash Flow */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{d.netCashFlow}</span>
                  <span className="text-sm font-bold tabular-nums text-emerald-600">+{curr} 33,000</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: "60%" }} />
                </div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">{d.cashFlowPositive}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bank Accounts */}
        {sections.banks && (
          <BankAccountsList
            accounts={bankAccountsFromApi}
            currency={curr}
            isAr={isAr}
            title={d.bankBalances}
            showAllLabel={d.showAll}
            showLessLabel={d.showLess}
            ofTotalLabel={d.ofTotal}
            cashPositioningLabel={t.nav.cashPositioning}
          />
        )}

        {/* Upcoming Payments */}
        {sections.upcoming && (
          <UpcomingPayments
            payments={UPCOMING}
            currency={curr}
            isAr={isAr}
            title={d.upcomingPayments}
            dueInLabel={d.dueIn}
            daysLabel={d.days}
          />
        )}
      </div>

      {/* ═══ BOTTOM ROW: Recent Activity (AI Agents moved to right sidebar) ═══ */}
      {sections.activity && (
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{d.recentActivity}</CardTitle>
              </div>
              <Link href={transactionsHref} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                {t.nav.transactions} →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {transactionsLoading ? (
              <div className="space-y-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-b-0">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-20 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
            <div className="space-y-1">
              {recentTxList.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-b-0">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    tx.type === "inflow" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-rose-100 dark:bg-rose-900/40"
                  )}>
                    {tx.type === "inflow"
                      ? <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                      : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{isAr ? tx.descAr : tx.descEn}</p>
                    <p className="text-[10px] text-muted-foreground">{isAr ? tx.timeAr : tx.time}</p>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold tabular-nums shrink-0",
                    tx.type === "inflow" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {tx.type === "inflow" ? "+" : "-"}{curr} {tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>
      )}

      </div>
      {/* Right sidebar — AI Agents, Liquidity Summary, Quick Links */}
      <DashboardRightSidebar />
    </div>
  );
}
