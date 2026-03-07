"use client";

/**
 * Cash Positioning — بيانات حقيقية من useCashPosition و useTransactions.
 * نفس التخطيط (لوحة يسرى + تفاصيل حساب + معاملات) مع بيانات الـ API.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles, ChevronDown, Search, AlertTriangle, Info, RefreshCw, FileImage, FileDown,
  Building2, ArrowDownLeft, ArrowUpRight, Zap, TrendingUp,
  Download, Shield, Bot, ChevronRight, X, ArrowLeftRight, Settings2, Lightbulb,
} from "lucide-react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Area,
} from "recharts";
import { chartGridProps, chartXAxisProps, chartYAxisProps, chartTooltipCursor, CHART_TOOLTIP_CLASS } from "@/components/charts/chartStyles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useCashPosition, useCashPositionHistory, getYesterdayAsOf } from "@/lib/hooks/useCashPosition";
import { useTransactions } from "@/features/transactions/hooks";
import { exportElementAsPNG, exportElementAsPDF } from "@/lib/export";
import type { CashPositionExplanation } from "@/features/cash-position/types";
import { CashPositionExplanationPanel } from "@/components/cash-position/CashPositionExplanationPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const CHART_EXPORT_ID = "cash-position-chart-card";
const HISTORICAL_DAYS = 14;

const DEFAULT_MIN_CASH_THRESHOLD = 50_000;

const ACCOUNT_COLORS = ["bg-indigo-500", "bg-zinc-400", "bg-sky-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-emerald-500"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtAbs(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(0)}k`;
  return abs.toLocaleString();
}

function fmtFull(n: number, curr: string, sign = true): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!sign) return `${formatted} ${curr}`;
  const s = n < 0 ? "-" : "+";
  return `${s}${formatted} ${curr}`;
}

// ── Daily Insight (rule-based from chart + totals + threshold) ──────────────────

function getDailyInsight(
  chartPoints: { actual: number | null }[],
  totalCash: number,
  minThreshold: number,
  accounts: { balance: number }[],
  fmt: (n: number) => string,
  currCode: string,
  isAr: boolean
): string {
  const withActual = chartPoints.filter((p) => p.actual != null) as { actual: number }[];
  const daysBelow = withActual.filter((p) => p.actual < minThreshold).length;
  const avgBalance =
    withActual.length > 0
      ? withActual.reduce((s, p) => s + p.actual, 0) / withActual.length
      : totalCash;
  const pctVsAvg =
    avgBalance !== 0 ? ((totalCash - avgBalance) / Math.abs(avgBalance)) * 100 : 0;
  const maxAccountBalance =
    accounts.length > 0 ? Math.max(...accounts.map((a) => a.balance)) : 0;
  const concentrationPct = totalCash !== 0 ? (maxAccountBalance / totalCash) * 100 : 0;

  if (daysBelow > 0) {
    return isAr
      ? `انخفض الرصيد النقدي تحت الحد الأدنى (${fmt(minThreshold)} ${currCode}) في ${daysBelow} يوم خلال الفترة — راقب الوضع عن كثب.`
      : `Cash dipped below the minimum threshold (${fmt(minThreshold)} ${currCode}) on ${daysBelow} days in this period – monitor closely.`;
  }
  if (concentrationPct >= 65 && accounts.length > 1) {
    return isAr
      ? `أكثر من ${Math.round(concentrationPct)}% من النقد في حساب واحد؛ يُنصح بتنويع التعرض البنكي.`
      : `More than ${Math.round(concentrationPct)}% of your cash is in one account; consider diversifying bank exposure.`;
  }
  if (withActual.length > 0 && Math.abs(pctVsAvg) >= 5) {
    const dir = pctVsAvg > 0 ? (isAr ? "أعلى" : "higher") : (isAr ? "أقل" : "lower");
    return isAr
      ? `الرصيد النقدي الحالي ${dir} من متوسط آخر ${withActual.length} يوم بنسبة ${Math.abs(pctVsAvg).toFixed(0)}%.`
      : `Current cash balance is ${Math.abs(pctVsAvg).toFixed(0)}% ${dir} than the average of the last ${withActual.length} days.`;
  }
  return isAr
    ? `لم ينخفض الرصيد خلال الفترة عن الحد الأدنى (${fmt(minThreshold)} ${currCode}).`
    : `No days in this period dropped below the minimum cash threshold of ${fmt(minThreshold)} ${currCode}.`;
}

// ── Types (UI shape; data from API) ────────────────────────────────────────────

interface ChartPoint {
  dateEn: string;
  dateAr: string;
  date: string;
  actual: number | null;
  forecast: number | null;
  isToday?: boolean;
}

interface AccountRow {
  id: string;
  nameEn: string;
  nameAr: string;
  bank: string;
  type: string;
  typeAr: string;
  prevBalance: number;
  todayBalance: number;
  overdraftLimit?: number;
  color: string;
}

interface TxRow {
  id: string;
  nameEn: string;
  nameAr: string;
  categoryEn: string;
  categoryAr: string;
  amount: number;
  type: "in" | "out";
  accountId: string;
  vatRingfenced?: boolean;
}

// ── Min threshold edit (قابل للتعديل من الواجهة) ───────────────────────────────

function MinThresholdEdit({
  value,
  onChange,
  isAr,
  currCode,
}: {
  value: number;
  onChange: (n: number) => void;
  isAr: boolean;
  currCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(String(value));
  useEffect(() => {
    if (open) setInputVal(String(value));
  }, [open, value]);
  const apply = () => {
    const n = parseInt(inputVal.replace(/\D/g, ""), 10);
    if (!Number.isNaN(n) && n >= 0) {
      onChange(n);
      setOpen(false);
    }
  };
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-label={isAr ? "تغيير الحد الأدنى" : "Edit min threshold"}
        >
          <Settings2 className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isAr ? "start" : "end"} className="p-3 min-w-[200px]">
        <label className="text-xs font-medium text-foreground block mb-2">
          {isAr ? "الحد الأدنى للنقد" : "Min cash threshold"} ({currCode})
        </label>
        <Input
          type="text"
          inputMode="numeric"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className="h-8 text-xs mb-2"
        />
        <Button size="sm" className="w-full h-7 text-xs" onClick={apply}>
          {isAr ? "تطبيق" : "Apply"}
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, fmt }: {
  active?: boolean; payload?: any[]; label?: string; fmt: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p) => p.dataKey === "actual");
  const forecast = payload.find((p) => p.dataKey === "forecast");
  return (
    <div className={cn(CHART_TOOLTIP_CLASS, "space-y-1.5 text-xs min-w-[180px]")}>
      <p className="font-semibold text-zinc-100 border-b border-zinc-700 pb-2">{label}</p>
      {actual?.value != null && (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" />
            Actual
          </span>
          <span className="font-mono font-semibold tabular-nums text-zinc-200" dir="ltr">
            {fmt(actual.value)}
          </span>
        </div>
      )}
      {forecast?.value != null && (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="h-2 w-2 rounded-full border border-violet-400 inline-block" />
            Forecast
          </span>
          <span className="font-mono font-semibold tabular-nums text-zinc-400" dir="ltr">
            {fmt(forecast.value)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CashPositioningPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { profile } = useCompany();
  void profile;
  const { fmt, fmtAxis, selected: currCode } = useCurrency();
  const { currentTenant } = useTenant();
  const todayQuery = useCashPosition(currentTenant?.id);
  const yesterdayQuery = useCashPosition(currentTenant?.id, getYesterdayAsOf());
  const historyQuery = useCashPositionHistory(currentTenant?.id, HISTORICAL_DAYS);
  const cashData = todayQuery.data;
  const totalFromApi = todayQuery.totalBalance;
  const cashLoading = todayQuery.isLoading;
  const { data: txList = [] } = useTransactions(currentTenant?.id, { limit: 2000 });

  const [explainOpen, setExplainOpen] = useState(false);
  const [minCashThreshold, setMinCashThreshold] = useState(DEFAULT_MIN_CASH_THRESHOLD);
  const [analysisTab, setAnalysisTab] = useState<"account" | "bank" | "liquidity">("account");
  const [exporting, setExporting] = useState(false);
  const [txDisplayLimit, setTxDisplayLimit] = useState(200);

  const handleRefresh = useCallback(() => {
    todayQuery.refetch();
    yesterdayQuery.refetch();
    historyQuery.refetch();
  }, [todayQuery, yesterdayQuery, historyQuery]);

  const handleExportPNG = useCallback(async () => {
    setExporting(true);
    try {
      await exportElementAsPNG(CHART_EXPORT_ID, `cash-position-${new Date().toISOString().slice(0, 10)}`);
    } finally {
      setExporting(false);
    }
  }, []);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      await exportElementAsPDF(CHART_EXPORT_ID, `cash-position-${new Date().toISOString().slice(0, 10)}`);
    } finally {
      setExporting(false);
    }
  }, []);

  const netChangeVsYesterday = useMemo(() => {
    if (cashLoading || yesterdayQuery.isLoading || yesterdayQuery.totalBalance == null) return null;
    const prev = yesterdayQuery.totalBalance;
    if (prev === 0) return null;
    const change = (totalFromApi ?? 0) - prev;
    const pct = (change / prev) * 100;
    return { absolute: change, pct };
  }, [cashLoading, yesterdayQuery.isLoading, yesterdayQuery.totalBalance, totalFromApi]);

  const explanation: CashPositionExplanation | null = useMemo(() => {
    if (!cashData) return null;
    const composition = (cashData.accounts ?? []).map((a) => ({
      accountId: a.accountId,
      name: a.name,
      currency: a.currency,
      balance: a.balance,
    }));
    const recentTransactions = (txList ?? []).slice(0, 5).map((t) => ({
      id: t.id,
      description: t.description || (t.counterparty?.name ?? "—"),
      amount: t.amount,
      date: t.txn_date || t.created_at || "",
    }));
    return {
      totalCash: totalFromApi ?? 0,
      primaryCurrency: cashData.totals?.byCurrency?.[0]?.currency ?? "SAR",
      composition,
      recentTransactions,
    };
  }, [cashData, txList, totalFromApi]);

  const [selectedDate, setSelectedDate] = useState("19 Dec");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [txSearch, setTxSearch] = useState("");
  const [aiExpanded, setAiExpanded] = useState(true);

  // Build account list from API: "all" + one row per account
  const accountsList = useMemo((): AccountRow[] => {
    if (!cashData?.accounts?.length) return [];
    const total = totalFromApi ?? 0;
    const rows: AccountRow[] = [
      { id: "all", nameEn: "All Accounts", nameAr: "جميع الحسابات", bank: "", type: "Summary", typeAr: "ملخص", prevBalance: total, todayBalance: total, color: ACCOUNT_COLORS[0] },
    ];
    cashData.accounts.forEach((a, i) => {
      rows.push({
        id: a.accountId,
        nameEn: a.name,
        nameAr: a.name,
        bank: "",
        type: "Current",
        typeAr: "جاري",
        prevBalance: a.balance,
        todayBalance: a.balance,
        color: ACCOUNT_COLORS[(i % (ACCOUNT_COLORS.length - 1)) + 1],
      });
    });
    return rows;
  }, [cashData?.accounts, totalFromApi]);

  // Group by bank (infer from account name: part before " – " / " - " or first word)
  const accountsByBank = useMemo(() => {
    if (!accountsList.length || accountsList[0].id === "all") return [];
    const map = new Map<string, { bank: string; total: number; count: number }>();
    accountsList.forEach((acc) => {
      if (acc.id === "all") return;
      const bank =
        acc.nameEn.includes(" – ")
          ? acc.nameEn.split(" – ")[0].trim()
          : acc.nameEn.includes(" - ")
            ? acc.nameEn.split(" - ")[0].trim()
            : acc.nameEn.split(/\s+/)[0] ?? "Other";
      const prev = map.get(bank);
      if (prev) {
        prev.total += acc.todayBalance;
        prev.count += 1;
      } else map.set(bank, { bank, total: acc.todayBalance, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [accountsList]);

  // Default selected account when list loads
  const selectedAccount = useMemo(() => {
    if (accountsList.length === 0) return null;
    const found = accountsList.find((a) => a.id === selectedAccountId);
    return found ?? accountsList[0];
  }, [accountsList, selectedAccountId]);

  // Transactions from API, mapped to UI shape; filter by selected account
  const rawTransactions = useMemo((): TxRow[] => {
    const list = txList.map((t) => ({
      id: t.id,
      nameEn: t.description || t.counterparty?.name || "—",
      nameAr: t.description || t.counterparty?.name || "—",
      categoryEn: t.category ?? "",
      categoryAr: t.category ?? "",
      amount: t.amount,
      type: (t.amount >= 0 ? "in" : "out") as "in" | "out",
      accountId: t.account_id ?? "",
      vatRingfenced: false,
    }));
    if (selectedAccountId === "all") return list;
    return list.filter((t) => t.accountId === selectedAccountId);
  }, [txList, selectedAccountId]);

  const filteredTxns = useMemo(() => {
    const query = txSearch.toLowerCase();
    return rawTransactions.filter((t) => {
      const name = isAr ? t.nameAr : t.nameEn;
      const cat = isAr ? t.categoryAr : t.categoryEn;
      return !query || name.toLowerCase().includes(query) || cat.toLowerCase().includes(query);
    });
  }, [rawTransactions, txSearch, isAr]);

  const totalInflow = rawTransactions.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOutflow = rawTransactions.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);
  const openingBal = selectedAccount ? selectedAccount.todayBalance - totalInflow - totalOutflow : 0;
  const closingBal = selectedAccount ? selectedAccount.todayBalance : 0;
  const isOverdraft = closingBal < 0;
  const vatAmount = rawTransactions.filter((t) => t.vatRingfenced).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Net cash flow last 30 days (from transactions) + runway + risk point for KPI strip
  const netFlow30RunwayRisk = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const from = thirtyDaysAgo.toISOString().slice(0, 10);
    const last30 = (txList ?? []).filter((t) => (t.txn_date || t.created_at?.slice(0, 10) || "") >= from);
    const netFlow30 = last30.reduce((s, t) => s + (t.amount ?? 0), 0);
    const runwayMonths: number | null =
      netFlow30 >= 0 ? null : (totalFromApi ?? 0) / Math.abs(netFlow30);
    const riskPoint =
      runwayMonths == null
        ? null
        : runwayMonths > 12
          ? "none_in_12"
          : runwayMonths;
    return { netFlow30, runwayMonths, riskPoint };
  }, [txList, totalFromApi]);

  const { netFlow30, runwayMonths, riskPoint } = netFlow30RunwayRisk;
  const asOfDate = new Date().toLocaleDateString(isAr ? "ar-SA" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  // Map history points by YYYY-MM-DD for chart
  const historyByDate = useMemo(() => {
    const map: Record<string, number> = {};
    historyQuery.points.forEach((p) => {
      map[p.date] = p.totalBalance;
    });
    return map;
  }, [historyQuery.points]);

  // Chart: last 30 days; actual from history when backend supports asOf, else only today
  const chartData = useMemo((): ChartPoint[] => {
    const today = new Date();
    const points: ChartPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dateEn = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const dateAr = d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
      const isToday = i === 0;
      const historicalBalance = historyByDate[dateKey];
      const actual =
        historicalBalance != null
          ? historicalBalance
          : isToday
            ? (totalFromApi ?? null)
            : null;
      points.push({
        dateEn,
        dateAr,
        date: isAr ? dateAr : dateEn,
        actual,
        forecast: null,
        isToday,
      });
    }
    return points;
  }, [totalFromApi, isAr, historyByDate]);

  // Daily insight message (rule-based; depends on chartData)
  const dailyInsightMessage = useMemo(
    () =>
      getDailyInsight(
        chartData,
        totalFromApi ?? 0,
        minCashThreshold,
        (cashData?.accounts ?? []).map((a) => ({ balance: a.balance })),
        fmt,
        currCode,
        isAr
      ),
    [chartData, totalFromApi, minCashThreshold, cashData?.accounts, fmt, currCode, isAr]
  );

  function handleChartClick(_data: unknown) {
    // Optional: could set selectedDate from chart point
  }

  return (
    <div dir={dir} className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] w-full overflow-hidden">

      {/* ════════════════════════════════════════════════════════════════════════
          MASTER PANE (LEFT)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-[3] flex flex-col gap-4 overflow-y-auto p-5 md:p-6 min-w-0 pb-6">

        {/* ── KPI strip (Scenario Planner style) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <Card className="border-s-4 border-s-indigo-500 shadow-sm border-border/50 overflow-hidden">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "إجمالي النقد اليوم" : "Total Cash Today"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {cashLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-xl font-bold tabular-nums tracking-tighter" dir="ltr" suppressHydrationWarning>
                  {fmt(totalFromApi ?? 0)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "حتى " : "As of "}{asOfDate}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-s-4 shadow-sm border-border/50 overflow-hidden",
            (netFlow30 ?? 0) >= 0 ? "border-s-emerald-500" : "border-s-destructive"
          )}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "صافي التدفق (30 يوم)" : "Net Cash Flow (30d)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={cn(
                "text-xl font-bold tabular-nums tracking-tighter",
                (netFlow30 ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              )} dir="ltr" suppressHydrationWarning>
                {(netFlow30 ?? 0) >= 0 ? "+" : ""}{fmt(netFlow30 ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "بناءً على آخر 30 يوم" : "Based on last 30 days"}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-s-4 shadow-sm border-border/50 overflow-hidden",
            runwayMonths == null ? "border-s-emerald-500" : (runwayMonths > 6 ? "border-s-amber-500" : "border-s-destructive")
          )}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "المدرج الزمني المتوقع" : "Projected Runway"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={cn(
                "text-xl font-bold tabular-nums tracking-tighter",
                runwayMonths == null ? "text-emerald-600 dark:text-emerald-400" : (runwayMonths > 6 ? "text-amber-600 dark:text-amber-400" : "text-destructive")
              )}>
                {runwayMonths == null
                  ? (isAr ? "∞ (مربح)" : "∞ Profitable")
                  : `${runwayMonths.toFixed(1)} ${isAr ? "شهر" : "months"}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "عند معدل الحرق الحالي" : "At current burn rate"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-s-4 border-s-muted shadow-sm border-border/50 overflow-hidden">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "أقرب نقطة خطر" : "Next Risk Point"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold tabular-nums tracking-tighter">
                {riskPoint === "none_in_12"
                  ? (isAr ? "لا نقص في 12 شهراً" : "None in 12 months")
                  : typeof riskPoint === "number"
                    ? (isAr ? `نقص متوقع خلال ${riskPoint.toFixed(0)} شهر` : `Shortfall in ~${riskPoint.toFixed(0)} mo`)
                    : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "أقرب عجز متوقع" : "Earliest projected shortfall"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Header ── */}
        <div>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isAr ? "تمركز السيولة" : "Cash Positioning"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isAr ? "12 ديس 2025 ← 18 يناير 2026" : "12 Dec 2025 → 18 Jan 2026"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleRefresh}
                disabled={todayQuery.isFetching || historyQuery.isFetching}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", (todayQuery.isFetching || historyQuery.isFetching) && "animate-spin")} />
                {isAr ? "تحديث" : "Refresh"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled={exporting}>
                    <Download className="h-3.5 w-3.5" />
                    {isAr ? "تصدير الشارت" : "Export chart"}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isAr ? "start" : "end"}>
                  <DropdownMenuLabel>{isAr ? "تحميل الرسم" : "Download chart"}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleExportPNG}>
                    <FileImage className="h-4 w-4 me-2" />
                    {isAr ? "PNG" : "Export PNG"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileDown className="h-4 w-4 me-2" />
                    {isAr ? "PDF" : "Export PDF"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                {isAr ? "جميع الحسابات" : "All Accounts"} <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.6)]">
                <Sparkles className="h-3.5 w-3.5" />
                {isAr ? "موازنة ذكية" : "Smart Balance"}
              </Button>
            </div>
          </div>

          {/* Total balance (from API) + Explain this + Net change vs yesterday */}
          <div className="mt-4 flex items-end gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {cashLoading ? (
                  <Skeleton className="h-9 w-40" />
                ) : (
                  <p className="text-3xl font-bold tabular-nums tracking-tight" dir="ltr" suppressHydrationWarning>
                    {fmt(totalFromApi ?? 0)}
                  </p>
                )}
                {/* Explain this — يظهر دائماً؛ عند الضغط تفتح لوحة تكوين الإجمالي + آخر 5 معاملات */}
                {!cashLoading && (
                  <button
                    type="button"
                    onClick={() => setExplainOpen(true)}
                    className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-1"
                    aria-label={isAr ? "شرح هذا الرقم" : "Explain this"}
                  >
                    <Info className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-medium">
                  <ArrowUpRight className="h-3 w-3" />
                  {isAr ? "إجمالي الأرصدة البنكية" : "Total Bank Balances"}
                </span>
                {/* التغيّر عن أمس — useCashPosition(اليوم) و useCashPosition(أمس) */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium",
                    netChangeVsYesterday == null && "text-muted-foreground",
                    netChangeVsYesterday != null && netChangeVsYesterday.absolute >= 0 && "text-emerald-600 bg-emerald-500/10",
                    netChangeVsYesterday != null && netChangeVsYesterday.absolute < 0 && "text-rose-500 bg-rose-500/10"
                  )}
                  dir="ltr"
                >
                  {isAr ? "عن أمس: " : "vs yesterday: "}
                  {netChangeVsYesterday == null
                    ? "—"
                    : `${netChangeVsYesterday.absolute >= 0 ? "+" : ""}${fmt(netChangeVsYesterday.absolute)} (${netChangeVsYesterday.pct >= 0 ? "+" : ""}${netChangeVsYesterday.pct.toFixed(1)}%)`}
                </span>
                {selectedAccount && isOverdraft && (
                  <span className="inline-flex items-center gap-1 text-xs text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md font-medium animate-pulse">
                    <AlertTriangle className="h-3 w-3" />
                    {isAr ? "في منطقة السحب المكشوف" : "In overdraft zone"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              {isAr ? "تخصيص التوقعات" : "Allocate Forecast"} <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              {isAr ? "تعيين معاملات" : "Assign Transactions"} <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </div>
        </div>

        {/* ── Chart card (id for PNG/PDF export) ── */}
        <Card id={CHART_EXPORT_ID} className="shadow-sm border-border/50 shrink-0">
          <CardContent className="p-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {isAr ? "تطور الرصيد النقدي" : "Cash Balance Trend"}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-indigo-500 inline-block rounded" />
                  {isAr ? "فعلي" : "Actual"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t-2 border-dashed border-violet-400 inline-block" />
                  {isAr ? "متوقع" : "Forecast"}
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                onClick={handleChartClick}
                style={{ cursor: "pointer" }}
              >
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="rgb(99,102,241)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="rgb(99,102,241)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="date" {...chartXAxisProps} />
                <YAxis {...chartYAxisProps} width={54} tickFormatter={fmtAxis} />
                <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={chartTooltipCursor} key={currCode} />

                {/* Zero reference */}
                <ReferenceLine y={0} stroke="hsl(240 3.8% 46.1%)" strokeOpacity={0.3} strokeWidth={1} />

                {/* Min cash threshold (configurable later) */}
                <ReferenceLine
                  y={minCashThreshold}
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: isAr ? "الحد الأدنى" : "Min threshold", position: "insideTopRight", fontSize: 9, fill: "#f59e0b" }}
                />
                {/* Authorized overdraft floor */}
                <ReferenceLine
                  y={-460_000}
                  stroke="#ef4444"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: "-460k OD", position: "insideTopRight", fontSize: 9, fill: "#ef4444" }}
                />

                {/* Today marker (last point in chartData) */}
                {chartData.length > 0 && (
                  <ReferenceLine
                    x={chartData[chartData.length - 1].date}
                    stroke="#3b82f6"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: isAr ? "اليوم" : "Today", position: "insideTopRight", fontSize: 10, fill: "#3b82f6" }}
                  />
                )}

                {/* Area fill under actual */}
                <Area
                  type="monotone"
                  dataKey="actual"
                  fill="url(#actualGrad)"
                  stroke="transparent"
                  connectNulls={false}
                />

                {/* Actual line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="rgb(99,102,241)"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    if (!props?.payload) return <circle r={0} />;
                    const { cx, cy, payload } = props;
                    const isSelected = (isAr ? payload.dateAr : payload.dateEn) === selectedDate || payload.dateEn === selectedDate;
                    return (
                      <circle
                        key={`dot-actual-${payload?.dateEn ?? cx}`}
                        cx={cx} cy={cy} r={isSelected ? 6 : 4}
                        fill={isSelected ? "rgb(99,102,241)" : "var(--background)"}
                        stroke="rgb(99,102,241)"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 6, fill: "rgb(99,102,241)", stroke: "var(--background)", strokeWidth: 2 }}
                  connectNulls={false}
                />

                {/* Forecast line (dashed) */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="rgb(167,139,250)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: "var(--background)", stroke: "rgb(167,139,250)", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "rgb(167,139,250)", stroke: "var(--background)", strokeWidth: 2 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            {/* حد أدنى قابل للتعديل — من الواجهة (لاحقاً من إعدادات الـ tenant) */}
            <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5" dir="ltr">
                <span className="inline-block w-4 h-0.5 border-t-2 border-amber-500 border-dashed" />
                {isAr ? "الحد الأدنى للنقد:" : "Min cash threshold:"} {fmt(minCashThreshold)} {currCode}
              </span>
              <MinThresholdEdit value={minCashThreshold} onChange={setMinCashThreshold} isAr={isAr} currCode={currCode} />
            </div>
          </CardContent>
        </Card>

        {/* ── Account grid + تبويبات تحليل (حسب الحساب / البنك / السيولة) ── */}
        <Card className="flex-1 overflow-hidden flex flex-col shadow-sm border-border/50 min-h-[220px]">
          <Tabs value={analysisTab} onValueChange={(v) => setAnalysisTab(v as "account" | "bank" | "liquidity")} className="flex-1 flex flex-col min-h-0">
            <div className="flex border-b shrink-0 flex-wrap items-center gap-2">
              <div className="px-4 py-2.5 text-xs font-semibold border-b-2 border-primary text-foreground">
                {isAr ? "ملخص الأرصدة" : "Balance Summary"}
              </div>
              <TabsList className="h-8 text-[11px] bg-muted/50">
                <TabsTrigger value="account" className="px-2.5 py-1 data-[state=active]:bg-background">
                  {isAr ? "حسب الحساب" : "By account"}
                </TabsTrigger>
                <TabsTrigger value="bank" className="px-2.5 py-1 data-[state=active]:bg-background">
                  {isAr ? "حسب البنك" : "By bank"}
                </TabsTrigger>
                <TabsTrigger value="liquidity" className="px-2.5 py-1 data-[state=active]:bg-background">
                  {isAr ? "حسب السيولة" : "By liquidity"}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <TabsContent value="account" className="mt-0 h-full">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="sticky start-0 bg-muted/30 z-10 p-2.5 text-start font-semibold text-muted-foreground min-w-[180px]">
                    {isAr ? "الحساب" : "Account"}
                  </th>
                  <th className="p-2.5 text-end font-semibold text-muted-foreground min-w-[150px]">
                    {isAr ? "الأربعاء 18/12" : "Wed 18/12"}
                  </th>
                  <th className="p-2.5 text-end font-semibold min-w-[150px] bg-indigo-500/5 text-indigo-700 dark:text-indigo-400">
                    {isAr ? "الخميس 19/12" : "Thu 19/12"}
                    <span className="block text-[9px] font-normal opacity-70">{isAr ? "اليوم" : "Today"}</span>
                  </th>
                  <th className="p-2.5 text-end font-semibold text-muted-foreground min-w-[80px]">
                    {isAr ? "التغيير" : "Change"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {cashLoading ? (
                  <tr><td colSpan={4} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>
                ) : accountsList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                      {isAr ? "لا توجد بيانات نقدية. قم بـ " : "No cash data. "}
                      <Link href="/app/import" className="text-primary underline">{isAr ? "استيراد CSV" : "Import CSV"}</Link>
                      {isAr ? " أو " : " or "}
                      <Link href="/app/integrations-hub" className="text-primary underline">{isAr ? "ربط بنك" : "Connect bank"}</Link>.
                    </td>
                  </tr>
                ) : (
                  accountsList.map((acc) => {
                    const delta = acc.todayBalance - acc.prevBalance;
                    const isNegToday = acc.todayBalance < 0;
                    const isSelected = selectedAccountId === acc.id;
                    return (
                      <tr
                        key={acc.id}
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={cn(
                          "border-b transition-colors cursor-pointer",
                          isSelected ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/40",
                          acc.id === "all" && "font-semibold bg-muted/20"
                        )}
                      >
                        <td className="sticky start-0 bg-card p-2.5 z-10">
                          <div className="flex items-center gap-2">
                            {acc.id !== "all" && (
                              <span className={`w-2 h-2 rounded-full shrink-0 ${acc.color}`} />
                            )}
                            <span className={cn(acc.id === "all" ? "ps-1" : "")}>
                              {isAr ? acc.nameAr : acc.nameEn}
                            </span>
                            {acc.overdraftLimit != null && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">OD</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-end tabular-nums font-mono" suppressHydrationWarning>
                          <span className="flex items-center justify-end gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${acc.prevBalance < 0 ? "bg-destructive" : "bg-emerald-500"}`} />
                            <span className={acc.prevBalance < 0 ? "text-destructive" : ""}>
                              {fmt(acc.prevBalance)}
                            </span>
                          </span>
                        </td>
                        <td className={cn(
                          "p-2.5 text-end tabular-nums font-mono bg-indigo-500/5",
                          isNegToday ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                        )} suppressHydrationWarning>
                          <span className="flex items-center justify-end gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isNegToday ? "bg-destructive" : "bg-emerald-500"}`} />
                            {fmt(acc.todayBalance)}
                          </span>
                        </td>
                        <td className="p-2.5 text-end tabular-nums">
                          <span className={cn(
                            "text-[11px] font-medium",
                            delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                          )}>
                            {delta >= 0 ? "+" : ""}{fmtAbs(delta)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
              </TabsContent>
              <TabsContent value="bank" className="mt-0 h-full">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-2.5 text-start font-semibold text-muted-foreground min-w-[140px]">{isAr ? "البنك" : "Bank"}</th>
                      <th className="p-2.5 text-end font-semibold text-muted-foreground">{isAr ? "الإجمالي" : "Total"}</th>
                      <th className="p-2.5 text-end font-semibold text-muted-foreground">{isAr ? "عدد الحسابات" : "Accounts"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountsByBank.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-sm text-muted-foreground">
                          {isAr ? "لا توجد بيانات مجمعة. اعرض حسب الحساب." : "No grouped data. View by account."}
                        </td>
                      </tr>
                    ) : (
                      accountsByBank.map((row) => (
                        <tr key={row.bank} className="border-b hover:bg-muted/30">
                          <td className="p-2.5 font-medium">{row.bank}</td>
                          <td className="p-2.5 text-end tabular-nums font-mono">{fmt(row.total)}</td>
                          <td className="p-2.5 text-end text-muted-foreground">{row.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </TabsContent>
              <TabsContent value="liquidity" className="mt-0 h-full">
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {isAr ? "تحليل حسب السيولة سيُربط بحقول من الـ API لاحقاً (مثلاً: سيولة متاحة، مجمدة، خط ائتمان)." : "Analysis by liquidity will use API fields later (e.g. available, locked, credit line)."}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          DETAIL PANE (RIGHT)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-[2] flex flex-col border-s border-border/50 overflow-y-auto min-w-0 pb-6">

        {/* Context header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                {selectedDate.toUpperCase()} {new Date().getFullYear()}
              </p>
              <p className="text-sm font-semibold mt-0.5">
                {selectedAccount ? (isAr ? selectedAccount.nameAr : selectedAccount.nameEn) : "—"}
                {selectedAccount?.bank && (
                  <span className="text-muted-foreground font-normal"> — {selectedAccount.bank}</span>
                )}
              </p>
            </div>
            {selectedAccount?.overdraftLimit != null && (
              <div className="flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-[11px] font-medium text-destructive shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
                <span dir="ltr">OD Limit: {fmt(Math.abs(selectedAccount.overdraftLimit))}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5 flex-1">

          {/* 4 Micro KPIs */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            {[
              { labelEn: "Opening Balance", labelAr: "رصيد افتتاحي", value: openingBal,    neg: openingBal < 0 },
              { labelEn: "Cash Inflow",      labelAr: "تدفق داخل",    value: totalInflow,   neg: false },
              { labelEn: "Cash Outflow",     labelAr: "تدفق خارج",    value: totalOutflow,  neg: true },
              { labelEn: "Closing Balance",  labelAr: "رصيد ختامي",   value: closingBal,    neg: closingBal < 0 },
            ].map((kpi) => (
              <div
                key={kpi.labelEn}
                className={cn(
                  "p-3 rounded-xl border text-center",
                  kpi.neg ? "border-destructive/20 bg-destructive/5" : "border-emerald-500/20 bg-emerald-500/5"
                )}
              >
                <p className="text-[10px] text-muted-foreground font-medium leading-none mb-1.5">
                  {isAr ? kpi.labelAr : kpi.labelEn}
                </p>
                <p className={cn(
                  "text-[11px] font-bold tabular-nums leading-none",
                  kpi.neg ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                )} dir="ltr" suppressHydrationWarning>
                  {kpi.value >= 0 ? "+" : ""}{fmtAbs(kpi.value)}
                </p>
              </div>
            ))}
          </div>

          {/* VAT ring-fenced badge */}
          {vatAmount > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2.5 shrink-0">
              <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {isAr ? "ضريبة القيمة المضافة محمية" : "VAT Ring-Fenced"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isAr
                    ? `${fmt(vatAmount)} مجمدة للزكاة والضريبة`
                    : `${fmt(vatAmount)} locked for ZATCA`}
                </p>
              </div>
              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium px-2 h-5">
                {isAr ? "مؤمّن" : "Locked"}
              </Badge>
            </div>
          )}

          {/* Create balancing transfer */}
          {isOverdraft && (
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 w-full border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5 shrink-0">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {isAr ? "إنشاء تحويل موازنة" : "Create Balancing Transfer"}
              <ChevronRight className="h-3.5 w-3.5 ms-auto opacity-50" />
            </Button>
          )}

          {/* Insight for today (rule-based from chart + totals + threshold) */}
          {aiExpanded && (
            <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 to-orange-500/5 p-4 shrink-0">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-500/20">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {isAr ? "بصيرة اليوم" : "Insight for today"}
                    </p>
                    <button onClick={() => setAiExpanded(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed mt-1.5">
                    {dailyInsightMessage}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="h-7 text-[11px] gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]" asChild>
                      <Link href="/app/scenario-planner">
                        <TrendingUp className="h-3 w-3" />
                        {isAr ? "عرض سيناريوهات" : "View Scenarios"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction list */}
          <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-border/50 min-h-[280px]">
            {/* Search + filter row */}
            <div className="flex items-center gap-2 p-3 border-b shrink-0">
              <div className="relative flex-1">
                <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={isAr ? "بحث في المعاملات..." : "Search transactions..."}
                  className="h-8 ps-8 text-xs"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0">
                {isAr ? "الكل" : "All Types"} <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </div>

            {/* Rows — show first N, then "Show more" */}
            <div className="flex-1 overflow-y-auto">
              {filteredTxns.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {isAr ? "لا توجد معاملات" : "No transactions found"}
                </div>
              ) : (
                <>
                  {filteredTxns.slice(0, txDisplayLimit).map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded shrink-0 accent-primary" />
                        {txn.type === "out" ? (
                          <span className="w-5 h-5 rounded-full border-2 border-destructive shrink-0 flex items-center justify-center">
                            <ArrowDownLeft className="h-3 w-3 text-destructive" />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 shrink-0 flex items-center justify-center">
                            <ArrowUpRight className="h-3 w-3 text-white" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[12px] font-medium truncate">
                              {isAr ? txn.nameAr : txn.nameEn}
                            </p>
                            {txn.vatRingfenced && (
                              <Badge className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                {isAr ? "ضريبة" : "VAT"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {isAr ? txn.categoryAr : txn.categoryEn}
                          </p>
                        </div>
                      </div>

                      <p className={cn(
                        "text-[12px] font-mono font-semibold tabular-nums shrink-0",
                        txn.amount < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                      )} dir="ltr" suppressHydrationWarning>
                        {txn.amount < 0 ? "-" : "+"}{fmtAbs(txn.amount)}
                      </p>
                    </div>
                  ))}
                  {filteredTxns.length > txDisplayLimit && (
                    <div className="p-2 border-t border-border/40 bg-muted/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => setTxDisplayLimit((n) => n + 200)}
                      >
                        {isAr
                          ? `عرض المزيد (${Math.min(200, filteredTxns.length - txDisplayLimit)})`
                          : `Show more (${Math.min(200, filteredTxns.length - txDisplayLimit)})`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

        </div>
      </div>

      <CashPositionExplanationPanel
        open={explainOpen}
        onOpenChange={setExplainOpen}
        explanation={explanation}
        loading={cashLoading}
        isAr={isAr}
      />
    </div>
  );
}
