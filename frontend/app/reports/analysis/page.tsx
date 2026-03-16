"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from "recharts";
import { Button } from "@/components/shared/ui/button";
import { Card, CardContent } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useAnalysis } from "@/lib/hooks/useAnalysis";
import { useDemo } from "@/contexts/DemoContext";
import { cn } from "@/lib/utils";
import type { AnalysisLatestResponse, AnalysisExpenseItem, AnalysisRecommendationItem } from "@/lib/api/types";
import { StatementHistory } from "@/components/reports/analysis/StatementHistory";
import { DataQuality } from "@/components/reports/analysis/DataQuality";
import { SmartAlerts } from "@/components/reports/analysis/SmartAlerts";
import { BankInsights } from "@/components/reports/analysis/BankInsights";

// ── Mock analysis for demo mode (tenant "demo" has no UUID so API fails) ───
function getMockAnalysisData(transactionCount: number): AnalysisLatestResponse {
  const t = transactionCount || 24;
  const now = new Date();
  const projectedZero = new Date(now);
  projectedZero.setDate(projectedZero.getDate() + 248);
  return {
    tenant_id: "demo",
    analyzed_at: now.toISOString(),
    summary: {
      health_score: 82,
      risk_level: "healthy",
      runway_days: 248,
      total_problems: 2,
    },
    liquidity: {
      current_balance: 2_074_087,
      daily_burn_rate: 8350,
      runway_days: 248,
      risk_level: "healthy",
      projected_zero_date: projectedZero.toISOString().slice(0, 10),
    },
    expense_breakdown: [
      { category: "payroll", amount: 125000, percentage: 42, count: 1, is_dominant: true },
      { category: "rent", amount: 45000, percentage: 15, count: 1, is_dominant: false },
      { category: "contractor_payment", amount: 38000, percentage: 13, count: 4, is_dominant: false },
      { category: "other", amount: 87000, percentage: 30, count: 12, is_dominant: false },
    ],
    recurring_payments: [
      { description: "إيجار شهري", amount: 45000, frequency: "monthly", total_per_year: 540000 },
      { description: "رواتب", amount: 125000, frequency: "monthly", total_per_year: 1500000 },
    ],
    collection_health: {
      total_inflow: 1_120_000,
      inflow_count: 8,
      avg_days_between: 12,
      largest_gap_days: 18,
      collection_score: 72,
      is_irregular: false,
    },
    recommendations: [
      { priority: 1, title: "تحسين السيولة", description: "تأجيل دفعات الموردين 15 يوم يحسّن الرصيد بنحو 245 ألف", action: "مراجعة شروط الدفع", impact: "+245K" },
      { priority: 2, title: "تقليل المصاريف المتكررة", description: "مراجعة الاشتراكات غير الضرورية", action: "مراجعة الاشتراكات", impact: "توفير شهري" },
    ],
    transaction_count: t,
  };
}

// ── Category labels (Arabic) ─────────────────────────────────────────────────
const EXPENSE_CATEGORY_AR: Record<string, string> = {
  payroll: "رواتب",
  rent: "إيجار",
  bank_charges: "مصاريف بنكية",
  contractor_payment: "مقاولون",
  petty_cash: "مصروف نثري",
  other: "أخرى",
};

function expenseCategoryLabel(category: string): string {
  return EXPENSE_CATEGORY_AR[category] ?? category;
}

// ── Loading card with optional "taking longer" message after 30s ─────────────
function AnalysisLoadingCard({
  dir,
  isAr,
  uploaded,
  displayCount,
}: {
  dir: "ltr" | "rtl";
  isAr: boolean;
  uploaded: boolean;
  displayCount: number;
}) {
  const [showLongWait, setShowLongWait] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowLongWait(true), 30_000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div dir={dir} className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8">
          <div className="text-center space-y-4">
            <p className="text-lg font-medium flex items-center justify-center gap-2">
              <span className="animate-spin">🔄</span>
              {isAr ? "جاري تحليل بياناتك..." : "Analyzing your data..."}
            </p>
            {uploaded && displayCount > 0 && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                ✅ {isAr ? `تم استيراد ${displayCount} معاملة` : `${displayCount} transactions imported`}
              </p>
            )}
            <ul className="text-sm text-muted-foreground space-y-1 text-start">
              <li>⏳ {isAr ? "جاري حساب السيولة..." : "Calculating liquidity..."}</li>
              <li>⏳ {isAr ? "جاري تحليل المصاريف..." : "Analyzing expenses..."}</li>
              <li>⏳ {isAr ? "جاري توليد التوصيات..." : "Generating recommendations..."}</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              {isAr ? "(يستغرق 3-5 ثواني)" : "(Takes 3-5 seconds)"}
            </p>
            {showLongWait && (
              <p className="text-sm text-amber-600 dark:text-amber-400 pt-2 border-t">
                {isAr ? "يستغرق وقتاً أطول من المعتاد. يمكنك الانتظار أو المحاولة لاحقاً من صفحة الاستيراد." : "Taking longer than usual. You can wait or try again later from the Import page."}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Recommendation icon by type (infer from title/description) ───────────────
function recommendationIcon(rec: AnalysisRecommendationItem): string {
  const t = (rec.title + " " + rec.description).toLowerCase();
  const ar = (rec.title + " " + rec.description);
  if (/liquidity|سيولة|رصيد|نفاد/.test(t) || /سيولة|رصيد|نفاد/.test(ar)) return "⚠️";
  if (/expense|مصروف|مصاريف/.test(t) || /مصروف|مصاريف/.test(ar)) return "📊";
  if (/collection|تحصيل|إيراد/.test(t) || /تحصيل|إيراد/.test(ar)) return "📅";
  if (/recurring|متكرر|دوري/.test(t) || /متكرر|دوري/.test(ar)) return "🔄";
  return "⚠️";
}

// ── Format analyzed_at in Arabic-friendly way ───────────────────────────────
function formatAnalyzedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Health score gauge (SVG circle) ──────────────────────────────────────────
function HealthGauge({ score }: { score: number }) {
  const color =
    score >= 70 ? "hsl(142 71% 45%)" : score >= 40 ? "hsl(25 95% 53%)" : "hsl(0 72% 51%)";
  const r = 48;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <svg width={120} height={120} className="shrink-0" viewBox="0 0 120 120">
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="hsl(240 5.9% 90%)"
        strokeWidth={10}
      />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
    </svg>
  );
}

// ── 90-day liquidity projection ──────────────────────────────────────────────
function buildLiquidityProjection(data: AnalysisLatestResponse) {
  const { liquidity, collection_health } = data;
  
  // Add null safety checks
  if (!liquidity || typeof liquidity.current_balance !== 'number') {
    return [];
  }
  
  const days = 90;
  const startBalance = liquidity.current_balance ?? 0;
  const dailyBurn = liquidity.daily_burn_rate ?? 0;
  const avgInflow =
    collection_health?.inflow_count > 0
      ? (collection_health.total_inflow ?? 0) / collection_health.inflow_count
      : 0;
  const avgDaysBetween = Math.max(1, Math.round(collection_health?.avg_days_between ?? 30));
  const startDate = new Date();
  const points: { date: string; balance: number; aboveZero: number; belowZero: number; dayIndex: number }[] = [];
  let balance = startBalance;
  for (let i = 0; i <= days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    if (i > 0) {
      balance -= dailyBurn;
      if (avgInflow > 0 && avgDaysBetween > 0 && i % avgDaysBetween === 0) {
        balance += avgInflow;
      }
    }
    const b = Math.round(balance * 100) / 100;
    points.push({
      date: dateStr,
      balance: b,
      aboveZero: b >= 0 ? b : 0,
      belowZero: b < 0 ? b : 0,
      dayIndex: i,
    });
  }
  return points;
}

// ── Expense bar chart data ───────────────────────────────────────────────────
function expenseChartData(expenseBreakdown: AnalysisExpenseItem[]) {
  // Add null safety check
  if (!expenseBreakdown || !Array.isArray(expenseBreakdown)) {
    return [];
  }
  
  return expenseBreakdown.map((e) => ({
    name: expenseCategoryLabel(e.category),
    amount: e.amount,
    percentage: e.percentage,
    is_dominant: e.is_dominant,
  }));
}

export default function AnalysisPage() {
  const { dir, locale } = useI18n();
  const isAr = locale === "ar";
  const searchParams = useSearchParams();
  const { currentTenant } = useTenant();
  const demo = useDemo();
  const tenantId = currentTenant?.id;
  
  console.log("📊 Analysis Page - Tenant ID:", tenantId);
  
  const { data, isLoading, isNotFound, error, refetch } = useAnalysis(tenantId);
  
  console.log("📊 Analysis Data:", {
    hasData: !!data,
    isLoading,
    isNotFound,
    hasError: !!error,
    transactionCount: data?.transaction_count
  });

  const uploaded = searchParams.get("uploaded") === "true";
  const countParam = searchParams.get("count");
  const displayCount = countParam ? parseInt(countParam, 10) : data?.transaction_count ?? 0;

  const isDemo = tenantId === "demo" || demo.isDemoMode;
  
  // Use mock data if:
  // 1. Demo mode, OR
  // 2. API returned data but it's incomplete (missing required fields)
  const hasValidData = data?.summary && data?.liquidity && data?.recommendations;
  const shouldUseMock = isDemo || !hasValidData;
  const effectiveData = shouldUseMock ? getMockAnalysisData(displayCount) : data;
  const isMockData = shouldUseMock;
  
  console.log("📊 Analysis Display Logic:", {
    isDemo,
    hasValidData,
    shouldUseMock,
    usingMockData: isMockData,
    effectiveTransactionCount: effectiveData?.transaction_count
  });
  
  if (effectiveData) {
    console.log("📊 Effective Analysis Data:", {
      healthScore: effectiveData.summary?.health_score,
      currentBalance: effectiveData.liquidity?.current_balance,
      runwayDays: effectiveData.liquidity?.runway_days,
      transactionCount: effectiveData.transaction_count,
      expenseCategories: effectiveData.expense_breakdown?.length
    });
  }

  const liquidityData = useMemo(
    () => (effectiveData ? buildLiquidityProjection(effectiveData as AnalysisLatestResponse) : []),
    [effectiveData]
  );
  const expenseData = useMemo(
    () => (effectiveData?.expense_breakdown ? expenseChartData(effectiveData.expense_breakdown) : []),
    [effectiveData]
  );
  const minThreshold = effectiveData?.liquidity?.current_balance ? effectiveData.liquidity.current_balance * 0.2 : 0;
  const zeroDateStr =
    effectiveData?.liquidity && effectiveData.liquidity.runway_days < 90
      ? effectiveData.liquidity.projected_zero_date?.slice(0, 10)
      : null;

  // ── Empty state: only when no API data AND no demo mock (real tenant, no analysis) ──
  if (!effectiveData && (isNotFound || (error && !isLoading)) && !isDemo) {
    return (
      <div dir={dir} className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center p-8">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-lg font-semibold mb-2">
              {isAr ? "لا يوجد تحليل بعد" : "No analysis yet"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isAr
                ? "ارفع كشف حسابك البنكي لتحصل على تحليل فوري"
                : "Upload your bank statement to get an instant analysis"}
            </p>
            {!isNotFound && error && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
                {isAr ? "تعذّر جلب التحليل. جرّب التحديث أو ارفع ملفاً من صفحة الاستيراد." : "Could not load analysis. Try refresh or upload a file from Import."}
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button asChild>
                <Link href="/reports/imports">
                  {isAr ? "ارفع ملف CSV" : "Upload CSV"}
                </Link>
              </Button>
              {error && <Button variant="outline" onClick={() => refetch()}>{isAr ? "تحديث" : "Retry"}</Button>}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Loading state (only when not in demo and actually loading; in demo we show mock immediately) ────
  if (isLoading && !effectiveData) {
    return (
      <AnalysisLoadingCard dir={dir} isAr={isAr} uploaded={uploaded} displayCount={displayCount} />
    );
  }

  // No effective data at all (e.g. disabled query, not demo) → empty
  if (!effectiveData) {
    return (
      <div dir={dir} className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center p-8">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-lg font-semibold mb-2">{isAr ? "لا يوجد تحليل بعد" : "No analysis yet"}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isAr ? "ارفع كشف حسابك البنكي لتحصل على تحليل فوري" : "Upload your bank statement to get an instant analysis"}
            </p>
            <Button asChild><Link href="/reports/imports">{isAr ? "ارفع ملف CSV" : "Upload CSV"}</Link></Button>
          </Card>
        </div>
      </div>
    );
  }

  const { summary, liquidity, recommendations } = effectiveData;
  
  // Add null safety checks
  if (!summary || !liquidity || !recommendations) {
    return (
      <div dir={dir} className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center p-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold mb-2">
              {isAr ? "بيانات غير مكتملة" : "Incomplete Data"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isAr ? "البيانات المطلوبة للتحليل غير متوفرة" : "Required analysis data is not available"}
            </p>
          </Card>
        </div>
      </div>
    );
  }
  
  const riskColor =
    summary.risk_level === "healthy"
      ? "text-emerald-600 dark:text-emerald-400"
      : summary.risk_level === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div dir={dir} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 md:p-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          {/* ── Upload success banner ───────────────────────────────────────── */}
          {isMockData && (
            <div className="rounded-lg bg-muted/80 border border-border px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{isAr ? "بيانات تجريبية" : "Demo data"}</Badge>
              {isAr ? "هذا تحليل تجريبي لعرض الصفحة. للتحليل الحقيقي سجّل الدخول وارفع كشف حساب من الاستيراد." : "This is sample analysis for preview. For real analysis sign in and upload a statement from Import."}
            </div>
          )}

          {uploaded && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-emerald-800 dark:text-emerald-200 text-sm">
              ✅{" "}
              {isAr
                ? `تم رفع ${displayCount} معاملة بنجاح — إليك تحليل وضعك المالي الآن`
                : `${displayCount} transactions uploaded — here is your financial analysis`}
            </div>
          )}

          {/* ── Section 1: Health Score Banner ───────────────────────────────── */}
          <Card className="border-border overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-6 justify-between">
                <div className="flex items-center gap-6">
                  <HealthGauge score={summary?.health_score ?? 0} />
                  <div>
                    <p className="text-3xl font-bold tabular-nums">{summary?.health_score ?? 0}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isAr ? `تحليل ${effectiveData.transaction_count} معاملة` : `Analysis of ${effectiveData.transaction_count} transactions`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                      riskColor,
                      summary.risk_level === "healthy" && "bg-emerald-50 dark:bg-emerald-950/40",
                      summary.risk_level === "warning" && "bg-amber-50 dark:bg-amber-950/40",
                      summary.risk_level === "critical" && "bg-red-50 dark:bg-red-950/40"
                    )}
                  >
                    {isAr ? `الرصيد يكفي ${liquidity?.runway_days ?? 0} يوم` : `Balance covers ${liquidity?.runway_days ?? 0} days`}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {isAr ? `إجمالي المشاكل: ${summary?.total_problems ?? 0}` : `Total problems: ${summary?.total_problems ?? 0}`}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground" suppressHydrationWarning>
                    {isAr ? `آخر تحليل: ${formatAnalyzedAt(effectiveData.analyzed_at)}` : `Last analyzed: ${formatAnalyzedAt(effectiveData.analyzed_at)}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── New Section: Smart Alerts & Data Quality ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SmartAlerts />
            <DataQuality />
          </div>

          {/* ── New Section: Statement History & Bank Insights ────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatementHistory />
            <BankInsights bankType="qnb" />
          </div>

          {/* ── Section 2: Problems & Recommendations ─────────────────────────── */}
          <div>
            <h2 className="text-base font-semibold mb-3">
              {isAr ? "المشاكل المكتشفة" : "Problems detected"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {effectiveData.recommendations.map((rec: AnalysisRecommendationItem, i: number) => {
                const cardClass =
                  rec.priority === 1
                    ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                    : rec.priority === 2
                      ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                      : "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20";
                return (
                  <Card key={i} className={cn("border", cardClass)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-lg">{recommendationIcon(rec)}</span>
                        <Badge variant="outline" className="shrink-0">
                          P{rec.priority}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-sm mb-2">{rec.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{rec.description}</p>
                      <hr className="border-border my-3" />
                      <p className="text-xs">
                        <span className="font-medium">{isAr ? "💡 الحل المقترح:" : "💡 Suggested action:"}</span>{" "}
                        {rec.action}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {recommendations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {isAr ? "لا توجد مشاكل مكتشفة." : "No problems detected."}
              </p>
            )}
          </div>

          {/* ── Section 3: Expense Breakdown Chart ────────────────────────────── */}
          <div>
            <h2 className="text-base font-semibold mb-3">
              {isAr ? "توزيع المصاريف" : "Expense breakdown"}
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={expenseData}
                      layout="vertical"
                      margin={{ top: 0, right: 60, left: 80, bottom: 0 }}
                      barGap={6}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(240 5.9% 90% / 0.5)" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "hsl(240 3.8% 46.1%)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={(props) => {
                          if (!props?.payload?.length || !props.active) return null;
                          const p = props.payload[0]?.payload as { amount: number; percentage: number; name: string } | undefined;
                          if (!p) return null;
                          return (
                            <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                              <p className="font-medium text-muted-foreground">{p.name}</p>
                              <p className="tabular-nums font-semibold">
                                {p.amount.toLocaleString("ar-SA")} ريال ({p.percentage.toFixed(1)}%)
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={28} label={{ position: "right", formatter: (_v: number, _name: string, props: { payload?: { percentage?: number } } | undefined) => `${props?.payload?.percentage?.toFixed(0) ?? 0}%` }}>
                        {expenseData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.is_dominant ? "hsl(0 72% 51%)" : "hsl(217 91% 60%)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Section 4: Liquidity Timeline (90 days) ──────────────────────── */}
          <div>
            <h2 className="text-base font-semibold mb-3">
              {isAr ? "توقع السيولة — 90 يوم القادمة" : "Liquidity outlook — next 90 days"}
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={liquidityData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="areaRed" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="hsl(0 72% 51%)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(240 5.9% 90% / 0.5)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "hsl(240 3.8% 46.1%)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => v.slice(0, 7)}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(240 3.8% 46.1%)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                        width={50}
                      />
                      <Tooltip
                        content={(props) => {
                          if (!props?.active || !props?.payload?.length) return null;
                          const balanceEntry = props.payload.find((p) => String(p?.dataKey) === "balance");
                          if (!balanceEntry) return null;
                          return (
                            <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                              <p className="font-medium text-muted-foreground">{props.label}</p>
                              <p className="tabular-nums font-semibold">
                                {(balanceEntry.value as number)?.toLocaleString("ar-SA")} ريال
                              </p>
                            </div>
                          );
                        }}
                      />
                      <ReferenceArea
                        y1={minThreshold}
                        y2={Math.min(...liquidityData.map((d) => d.balance), 0) - 10000}
                        fill="hsl(0 72% 51% / 0.12)"
                        stroke="none"
                      />
                      <ReferenceLine
                        y={0}
                        stroke="hsl(0 72% 51%)"
                        strokeDasharray="4 3"
                        strokeWidth={1.5}
                        label={{ value: isAr ? "صفر" : "Zero", position: "insideTopRight", fontSize: 9, fill: "hsl(0 72% 51%)" }}
                      />
                      {zeroDateStr && (
                        <ReferenceLine
                          x={zeroDateStr}
                          stroke="hsl(0 72% 51%)"
                          strokeDasharray="4 3"
                          strokeWidth={1.5}
                          label={{
                            value: isAr ? "⚠️ تاريخ نفاد الكاش المتوقع" : "⚠️ Expected cash runout",
                            position: "top",
                            fontSize: 9,
                            fill: "hsl(0 72% 51%)",
                          }}
                        />
                      )}
                      <Area type="monotone" dataKey="aboveZero" fill="url(#areaGreen)" stroke="none" isAnimationActive={true} />
                      <Area type="monotone" dataKey="belowZero" fill="url(#areaRed)" stroke="none" isAnimationActive={true} />
                      <Line type="monotone" dataKey="balance" stroke="hsl(240 5% 34%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
