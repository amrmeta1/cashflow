"use client";

import {
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Zap,
  FileBarChart,
  Bot,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Trend = "up" | "down" | "stable";

interface RiskDimension {
  key: string;
  name: string;
  name_ar: string;
  score: number;
  prevScore: number;
  description: string;
  description_ar: string;
  metric: string;
  metric_ar: string;
  trend: Trend;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const RISK_DIMENSIONS: RiskDimension[] = [
  {
    key: "liquidity",
    name: "Liquidity Risk",
    name_ar: "مخاطر السيولة",
    score: 72,
    prevScore: 70,
    description: "Cash covers 2.4 months of expenses",
    description_ar: "النقد يغطي ٢.٤ شهر من المصروفات",
    metric: "2.4 months coverage",
    metric_ar: "تغطية ٢.٤ شهر",
    trend: "stable",
  },
  {
    key: "concentration",
    name: "Concentration Risk",
    name_ar: "مخاطر التركز",
    score: 85,
    prevScore: 75,
    description: "Top client is 40% of revenue",
    description_ar: "العميل الأكبر يمثل ٤٠٪ من الإيرادات",
    metric: "40% single client",
    metric_ar: "٤٠٪ عميل واحد",
    trend: "up",
  },
  {
    key: "fx",
    name: "FX Risk",
    name_ar: "مخاطر العملات",
    score: 35,
    prevScore: 38,
    description: "95% revenue in SAR",
    description_ar: "٩٥٪ من الإيرادات بالريال",
    metric: "95% SAR denominated",
    metric_ar: "٩٥٪ مقومة بالريال",
    trend: "stable",
  },
  {
    key: "collection",
    name: "Collection Risk",
    name_ar: "مخاطر التحصيل",
    score: 65,
    prevScore: 55,
    description: "Average collection: 38 days",
    description_ar: "متوسط التحصيل: ٣٨ يومًا",
    metric: "38 days avg",
    metric_ar: "متوسط ٣٨ يومًا",
    trend: "up",
  },
  {
    key: "expense",
    name: "Expense Volatility",
    name_ar: "تقلب المصروفات",
    score: 45,
    prevScore: 52,
    description: "Monthly variance: ±12%",
    description_ar: "التباين الشهري: ±١٢٪",
    metric: "±12% variance",
    metric_ar: "تباين ±١٢٪",
    trend: "down",
  },
  {
    key: "runway",
    name: "Runway Risk",
    name_ar: "مخاطر المدرج",
    score: 28,
    prevScore: 30,
    description: "8.3 months runway",
    description_ar: "مدرج ٨.٣ أشهر",
    metric: "8.3 months",
    metric_ar: "٨.٣ أشهر",
    trend: "stable",
  },
];

const OVERALL_SCORE = Math.round(
  RISK_DIMENSIONS.reduce((sum, d) => sum + d.score, 0) / RISK_DIMENSIONS.length
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score > 70) return "text-red-500 dark:text-red-400";
  if (score >= 40) return "text-amber-500 dark:text-amber-400";
  return "text-emerald-500 dark:text-emerald-400";
}

function scoreBg(score: number) {
  if (score > 70) return "bg-red-500/10 border-red-500/30";
  if (score >= 40) return "bg-amber-500/10 border-amber-500/30";
  return "bg-emerald-500/10 border-emerald-500/30";
}

function scoreBadgeVariant(score: number): "destructive" | "outline" | "secondary" {
  if (score > 70) return "destructive";
  if (score >= 40) return "outline";
  return "secondary";
}

function TrendIcon({ trend, isAr }: { trend: Trend; isAr: boolean }) {
  if (trend === "up")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
        <TrendingUp className="h-3.5 w-3.5" />
        {isAr ? "متزايد" : "Increasing"}
      </span>
    );
  if (trend === "down")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-500 dark:text-emerald-400">
        <TrendingDown className="h-3.5 w-3.5" />
        {isAr ? "متحسن" : "Improving"}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <ArrowRight className="h-3.5 w-3.5" />
      {isAr ? "مستقر" : "Stable"}
    </span>
  );
}

// Custom tooltip for the radar chart
function RadarTooltip({
  active,
  payload,
  isAr,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { label: string; label_ar: string } }>;
  isAr: boolean;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{isAr ? item.payload.label_ar : item.payload.label}</p>
      <p className="tabular-nums text-muted-foreground">
        {isAr ? "الدرجة" : "Score"}: <span className="font-semibold">{item.value}/100</span>
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RiskRadarPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { profile } = useCompany();
  const currency = profile.currency ?? "SAR";

  const radarData = RISK_DIMENSIONS.map((d) => ({
    label: d.name,
    label_ar: d.name_ar,
    subject: isAr ? d.name_ar : d.name,
    current: d.score,
    previous: d.prevScore,
  }));

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {isAr ? "رادار المخاطر" : "Risk Radar"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "تقييم شامل لمخاطر التدفقات النقدية"
                  : "Comprehensive cash flow risk assessment"}
              </p>
            </div>
          </div>
          <Badge
            variant={scoreBadgeVariant(OVERALL_SCORE)}
            className={cn(
              "text-sm px-4 py-1.5 gap-2",
              OVERALL_SCORE > 70
                ? ""
                : OVERALL_SCORE >= 40
                  ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                  : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            )}
          >
            <span className="tabular-nums font-bold">{OVERALL_SCORE}/100</span>
            {OVERALL_SCORE > 70
              ? isAr
                ? "مخاطر عالية"
                : "High Risk"
              : OVERALL_SCORE >= 40
                ? isAr
                  ? "مخاطر متوسطة"
                  : "Medium Risk"
                : isAr
                  ? "مخاطر منخفضة"
                  : "Low Risk"}
          </Badge>
        </div>

        {/* ── Radar Chart (Hero) ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {isAr ? "نظرة شاملة على أبعاد المخاطر" : "Risk Dimensions Overview"}
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                {isAr ? "الشهر الحالي" : "Current Month"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                {isAr ? "الشهر السابق" : "Previous Month"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{
                      fontSize: 12,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    className="text-xs"
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                  />
                  <Radar
                    name={isAr ? "الشهر السابق" : "Previous Month"}
                    dataKey="previous"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.05}
                  />
                  <Radar
                    name={isAr ? "الشهر الحالي" : "Current Month"}
                    dataKey="current"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.15}
                  />
                  <Tooltip
                    content={<RadarTooltip isAr={isAr} />}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── Risk Detail Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RISK_DIMENSIONS.map((dim) => (
            <Card
              key={dim.key}
              className={cn(
                "transition-all hover:shadow-md",
                scoreBg(dim.score),
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {isAr ? dim.name_ar : dim.name}
                  </CardTitle>
                  <span
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      scoreColor(dim.score),
                    )}
                  >
                    {dim.score}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isAr ? dim.description_ar : dim.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {isAr ? dim.metric_ar : dim.metric}
                  </span>
                  <TrendIcon trend={dim.trend} isAr={isAr} />
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      dim.score > 70
                        ? "bg-red-500"
                        : dim.score >= 40
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── AI Risk Assessment ── */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                <Bot className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "تقييم الوكيل رقيب" : "Agent Raqib's Risk Assessment"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "تحليل ذكي بناءً على بياناتك" : "AI-powered analysis based on your data"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
              {isAr ? (
                <p>
                  هناك مجالان يتطلبان اهتمامًا: <strong>(١)</strong> تركز العملاء ارتفع إلى ٤٠٪ — أوصي بتنويع قاعدة إيراداتك لتقليل المخاطر. <strong>(٢)</strong> متوسط أيام التحصيل ارتفع من ٣٢ إلى ٣٨ يومًا — فكّر في تفعيل تذكيرات واتساب للفواتير المتأخرة.
                </p>
              ) : (
                <p>
                  Two risk areas require attention: <strong>(1)</strong> Client concentration has increased to 40% — I recommend diversifying your revenue base to reduce single-point-of-failure risk. <strong>(2)</strong> Average collection days increased from 32 to 38 — consider activating WhatsApp reminders for overdue invoices.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" className="gap-2 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]">
                <Zap className="h-3.5 w-3.5" />
                {isAr ? "تفعيل التحصيل التلقائي" : "Activate Auto-Collection"}
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <FileBarChart className="h-3.5 w-3.5" />
                {isAr ? "عرض تقرير التركز" : "View Concentration Report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
