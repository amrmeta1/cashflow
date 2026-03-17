"use client";

import {
  BarChart3,
  Star,
  TrendingUp,
  ArrowUpRight,
  Bot,
  ChevronRight,
  Target,
  Award,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";

// ── Types & Data ──────────────────────────────────────────────────────────────

interface Metric {
  key: string;
  nameEn: string;
  nameAr: string;
  yours: number;
  average: number;
  top10: number;
  unitEn: string;
  unitAr: string;
  lowerIsBetter: boolean;
  radarYours: number;
  radarAvg: number;
}

const METRICS: Metric[] = [
  {
    key: "dso",
    nameEn: "Days Sales Outstanding (DSO)",
    nameAr: "أيام المبيعات المعلقة (DSO)",
    yours: 32,
    average: 45,
    top10: 22,
    unitEn: "days",
    unitAr: "يوم",
    lowerIsBetter: true,
    radarYours: 78,
    radarAvg: 55,
  },
  {
    key: "current-ratio",
    nameEn: "Current Ratio",
    nameAr: "نسبة التداول",
    yours: 1.8,
    average: 1.4,
    top10: 2.5,
    unitEn: "",
    unitAr: "",
    lowerIsBetter: false,
    radarYours: 72,
    radarAvg: 56,
  },
  {
    key: "ccc",
    nameEn: "Cash Conversion Cycle",
    nameAr: "دورة التحويل النقدي",
    yours: 48,
    average: 52,
    top10: 30,
    unitEn: "days",
    unitAr: "يوم",
    lowerIsBetter: true,
    radarYours: 65,
    radarAvg: 58,
  },
  {
    key: "ocf",
    nameEn: "Operating Cash Flow Margin",
    nameAr: "هامش التدفق النقدي التشغيلي",
    yours: 12,
    average: 15,
    top10: 22,
    unitEn: "%",
    unitAr: "٪",
    lowerIsBetter: false,
    radarYours: 55,
    radarAvg: 68,
  },
  {
    key: "collection",
    nameEn: "Collection Efficiency",
    nameAr: "كفاءة التحصيل",
    yours: 85,
    average: 72,
    top10: 95,
    unitEn: "%",
    unitAr: "٪",
    lowerIsBetter: false,
    radarYours: 89,
    radarAvg: 76,
  },
  {
    key: "burn",
    nameEn: "Burn Rate / Revenue Ratio",
    nameAr: "معدل الاستهلاك / نسبة الإيرادات",
    yours: 0.82,
    average: 0.78,
    top10: 0.65,
    unitEn: "",
    unitAr: "",
    lowerIsBetter: true,
    radarYours: 48,
    radarAvg: 55,
  },
];

const TREND_DATA = [
  { month: "Sep", monthAr: "سبت", score: 71 },
  { month: "Oct", monthAr: "أكت", score: 73 },
  { month: "Nov", monthAr: "نوف", score: 72 },
  { month: "Dec", monthAr: "ديس", score: 75 },
  { month: "Jan", monthAr: "ينا", score: 76 },
  { month: "Feb", monthAr: "فبر", score: 78 },
];

interface Peer {
  rank: number;
  nameEn: string;
  nameAr: string;
  score: number;
  dso: number;
  collection: number;
  isYou: boolean;
}

const PEERS: Peer[] = [
  { rank: 1, nameEn: "Company A", nameAr: "شركة أ", score: 92, dso: 18, collection: 96, isYou: false },
  { rank: 2, nameEn: "Company B", nameAr: "شركة ب", score: 87, dso: 25, collection: 91, isYou: false },
  { rank: 3, nameEn: "You", nameAr: "أنت", score: 78, dso: 32, collection: 85, isYou: true },
  { rank: 4, nameEn: "Company D", nameAr: "شركة د", score: 71, dso: 41, collection: 78, isYou: false },
  { rank: 5, nameEn: "Company E", nameAr: "شركة هـ", score: 63, dso: 52, collection: 68, isYou: false },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function isBetter(m: Metric): boolean {
  return m.lowerIsBetter ? m.yours < m.average : m.yours > m.average;
}

function barPercent(value: number, max: number): number {
  return Math.min((value / max) * 100, 100);
}

function metricMax(m: Metric): number {
  return Math.max(m.yours, m.average, m.top10) * 1.15;
}

function RadarTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; dataKey: string; payload: { subject: string } }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{payload[0]?.payload?.subject}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="tabular-nums text-muted-foreground">
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function TrendTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="tabular-nums text-muted-foreground">
        Score: <span className="font-semibold">{payload[0].value}/100</span>
      </p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BenchmarkPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { profile } = useCompany();

  const radarData = METRICS.map((m) => ({
    subject: isAr ? m.nameAr.split(" (")[0].split(" /")[0] : m.nameEn.split(" (")[0].split(" /")[0],
    yours: m.radarYours,
    average: m.radarAvg,
  }));

  const trendChartData = TREND_DATA.map((d) => ({
    name: isAr ? d.monthAr : d.month,
    score: d.score,
  }));

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── 1. Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {isAr ? "المقارنة المعيارية" : "Industry Benchmark"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "قارن أداءك مع أقرانك في القطاع"
                  : "Compare your performance with industry peers"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <Badge variant="secondary" className="px-3 py-1 text-xs font-medium rounded-full">
              {isAr ? "المقاولات والبناء" : "Construction & Contracting"}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "بناءً على ١٢٧ شركة سعودية في قطاعك"
                : "Based on 127 Saudi companies in your sector"}
            </p>
          </div>
        </div>

        {/* ── 2. Overall Score Hero ── */}
        <Card className="overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 dark:from-emerald-950/30 dark:via-background dark:to-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/40">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
              {/* Circular ring */}
              <div className="relative flex-shrink-0">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle
                    cx="70" cy="70" r="58"
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="10"
                    opacity="0.3"
                  />
                  <circle
                    cx="70" cy="70" r="58"
                    fill="none"
                    stroke="rgb(16 185 129)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(78 / 100) * 2 * Math.PI * 58} ${2 * Math.PI * 58}`}
                    transform="rotate(-90 70 70)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold tabular-nums">78</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-start space-y-2">
                <h2 className="text-lg font-semibold">
                  {isAr ? "درجة المقارنة المعيارية" : "Your Benchmark Score"}
                </h2>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {isAr ? "فوق المتوسط" : "Above Average"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isAr
                    ? "تتفوق على ٦٥٪ من الشركات في قطاعك"
                    : "You outperform 65% of companies in your sector"}
                </p>
              </div>

              <div className="hidden lg:flex items-center gap-3">
                <div className="text-center px-4">
                  <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">4</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr ? "مؤشرات أفضل" : "Better metrics"}
                  </p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="text-center px-4">
                  <p className="text-2xl font-bold tabular-nums text-amber-500">2</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr ? "تحتاج تحسين" : "Need improvement"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 3. KPI Comparison Grid ── */}
        <div>
          <h2 className="text-base font-semibold mb-4">
            {isAr ? "مقارنة المؤشرات الرئيسية" : "Key Metrics Comparison"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {METRICS.map((m) => {
              const better = isBetter(m);
              const max = metricMax(m);
              return (
                <Card key={m.key} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {isAr ? m.nameAr : m.nameEn}
                        </p>
                        <p className="text-2xl font-bold tabular-nums mt-1">
                          {m.yours}
                          {m.unitEn && (
                            <span className="text-sm font-normal text-muted-foreground ms-1">
                              {isAr ? m.unitAr : m.unitEn}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs shrink-0",
                          better
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        )}
                      >
                        {better
                          ? isAr ? "أفضل من المتوسط" : "Better than average"
                          : isAr ? "أقل من المتوسط" : "Below average"}
                      </Badge>
                    </div>

                    {/* Visual bars */}
                    <div className="space-y-2.5">
                      {/* Your value */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{isAr ? "أنت" : "You"}</span>
                          <span className="tabular-nums font-medium text-foreground">
                            {m.yours}{m.unitEn === "%" ? "%" : m.unitEn === "days" ? (isAr ? " يوم" : " days") : ""}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              better ? "bg-emerald-500" : "bg-amber-500"
                            )}
                            style={{ width: `${barPercent(m.yours, max)}%` }}
                          />
                        </div>
                      </div>

                      {/* Industry average */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{isAr ? "متوسط القطاع" : "Industry Avg"}</span>
                          <span className="tabular-nums">
                            {m.average}{m.unitEn === "%" ? "%" : m.unitEn === "days" ? (isAr ? " يوم" : " days") : ""}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-zinc-400 dark:bg-zinc-500 transition-all duration-700"
                            style={{ width: `${barPercent(m.average, max)}%` }}
                          />
                        </div>
                      </div>

                      {/* Top 10% */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{isAr ? "أفضل ١٠٪" : "Top 10%"}</span>
                          <span className="tabular-nums">
                            {m.top10}{m.unitEn === "%" ? "%" : m.unitEn === "days" ? (isAr ? " يوم" : " days") : ""}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400 dark:bg-emerald-500 transition-all duration-700"
                            style={{ width: `${barPercent(m.top10, max)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── 4. Radar Chart + 5. Trend — side by side on lg ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Radar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {isAr ? "مقارنة شاملة" : "Overall Comparison"}
              </CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  {isAr ? "شركتك" : "Your Company"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                  {isAr ? "متوسط القطاع" : "Industry Average"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                    />
                    <Radar
                      name={isAr ? "متوسط القطاع" : "Industry Average"}
                      dataKey="average"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      fill="hsl(var(--muted-foreground))"
                      fillOpacity={0.05}
                    />
                    <Radar
                      name={isAr ? "شركتك" : "Your Company"}
                      dataKey="yours"
                      stroke="rgb(16 185 129)"
                      strokeWidth={2}
                      fill="rgb(16 185 129)"
                      fillOpacity={0.15}
                    />
                    <Tooltip content={<RadarTooltipContent />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Trend Over Time */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "تطور الدرجة" : "Score Trend"}
                </CardTitle>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {isAr ? "في تحسّن" : "Improving"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAr ? "آخر ٦ أشهر" : "Last 6 months"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[60, 90]}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<TrendTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="rgb(16 185 129)"
                      strokeWidth={2.5}
                      fill="url(#scoreGradient)"
                      dot={{ r: 4, fill: "rgb(16 185 129)", stroke: "#fff", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 6. AI Insight ── */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                <Bot className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "تحليل الوكيل رقيب" : "Agent Raqib's Benchmark Insight"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "توصيات ذكية بناءً على مقارنتك" : "AI-powered recommendations based on your benchmarks"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
              {isAr ? (
                <p>
                  تحسّن مؤشر أيام المبيعات المعلقة من ٣٨ إلى ٣٢ يومًا هذا الربع — تقدّم ممتاز. للوصول إلى أفضل ١٠٪، ركّز على كفاءة التحصيل: فعّل المتابعة التلقائية للفواتير المتأخرة أكثر من ١٥ يومًا عبر نظام التحصيل الذكي.
                </p>
              ) : (
                <p>
                  Your DSO improved from 38 to 32 days this quarter — great progress. To reach top 10%, focus on Collection Efficiency: automate follow-ups for invoices &gt; 15 days via CashCollect.
                </p>
              )}
            </div>
            <Button size="sm" className="gap-2 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]">
              <ChevronRight className="h-3.5 w-3.5" />
              {isAr ? "عرض التحليل المفصل" : "View Detailed Analysis"}
            </Button>
          </CardContent>
        </Card>

        {/* ── 7. Peer Comparison Table ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "مقارنة الأقران" : "Peer Comparison"}
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr ? "ترتيبك بين شركات مجهولة في قطاعك" : "Your ranking among anonymized peers in your sector"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-start py-2.5 px-3 font-medium text-xs">
                      {isAr ? "الترتيب" : "Rank"}
                    </th>
                    <th className="text-start py-2.5 px-3 font-medium text-xs">
                      {isAr ? "الشركة" : "Company"}
                    </th>
                    <th className="text-start py-2.5 px-3 font-medium text-xs">
                      {isAr ? "الدرجة" : "Score"}
                    </th>
                    <th className="text-start py-2.5 px-3 font-medium text-xs">
                      DSO
                    </th>
                    <th className="text-start py-2.5 px-3 font-medium text-xs">
                      {isAr ? "التحصيل" : "Collection %"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PEERS.map((peer) => (
                    <tr
                      key={peer.rank}
                      className={cn(
                        "border-b last:border-0 transition-colors",
                        peer.isYou
                          ? "bg-emerald-50 dark:bg-emerald-950/20 font-semibold"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <td className="py-3 px-3 tabular-nums">
                        <span className={cn(
                          "inline-flex items-center justify-center h-6 w-6 rounded-full text-xs",
                          peer.rank === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          peer.isYou ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {peer.rank}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {peer.isYou && <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                          <span>{isAr ? peer.nameAr : peer.nameEn}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        <span className={cn(
                          peer.isYou && "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {peer.score}
                        </span>
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        {peer.dso} {isAr ? "يوم" : "days"}
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        {peer.collection}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
