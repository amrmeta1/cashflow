"use client";

import { useState } from "react";
import {
  Flame,
  Play,
  Bot,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { Slider } from "@/components/shared/ui/slider";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

// ── Fan Chart Data (12 months) ─────────────────────────────────────────────────

const FAN_DATA = [
  { month: "Mar", monthAr: "مارس",  p5: 4200, p10: 4300, p25: 4500, median: 4900, p75: 5100, p90: 5200, p95: 5300 },
  { month: "Apr", monthAr: "أبريل", p5: 4000, p10: 4150, p25: 4400, median: 4850, p75: 5150, p90: 5350, p95: 5500 },
  { month: "May", monthAr: "مايو",  p5: 3800, p10: 4000, p25: 4300, median: 4800, p75: 5200, p90: 5500, p95: 5700 },
  { month: "Jun", monthAr: "يونيو", p5: 3600, p10: 3850, p25: 4200, median: 4850, p75: 5300, p90: 5700, p95: 5900 },
  { month: "Jul", monthAr: "يوليو", p5: 3500, p10: 3750, p25: 4100, median: 4900, p75: 5400, p90: 5900, p95: 6100 },
  { month: "Aug", monthAr: "أغسطس",p5: 3400, p10: 3600, p25: 3800, median: 5000, p75: 5500, p90: 6000, p95: 6200 },
  { month: "Sep", monthAr: "سبتمبر",p5: 3300, p10: 3500, p25: 3700, median: 5000, p75: 5600, p90: 6100, p95: 6400 },
  { month: "Oct", monthAr: "أكتوبر",p5: 3200, p10: 3400, p25: 3600, median: 5050, p75: 5700, p90: 6300, p95: 6600 },
  { month: "Nov", monthAr: "نوفمبر",p5: 3100, p10: 3300, p25: 3500, median: 5100, p75: 5800, p90: 6500, p95: 6900 },
  { month: "Dec", monthAr: "ديسمبر",p5: 3000, p10: 3200, p25: 3400, median: 5100, p75: 5900, p90: 6700, p95: 7100 },
  { month: "Jan", monthAr: "يناير", p5: 2900, p10: 3100, p25: 3200, median: 5150, p75: 6000, p90: 6900, p95: 7300 },
  { month: "Feb", monthAr: "فبراير",p5: 2800, p10: 3000, p25: 3100, median: 5200, p75: 6100, p90: 7100, p95: 7600 },
];

interface StressScenario {
  nameEn: string;
  nameAr: string;
  probability: string;
  probabilityAr: string;
  impact: string;
  impactAr: string;
  cash12m: number;
  status: "safe" | "tight" | "critical";
}

const SCENARIOS: StressScenario[] = [
  { nameEn: "Base Case", nameAr: "الحالة الأساسية", probability: "45%", probabilityAr: "٤٥٪", impact: "—", impactAr: "—", cash12m: 5_200_000, status: "safe" },
  { nameEn: "Mild Recession", nameAr: "ركود طفيف", probability: "25%", probabilityAr: "٢٥٪", impact: "Revenue -10%", impactAr: "إيرادات -١٠٪", cash12m: 4_100_000, status: "safe" },
  { nameEn: "Severe Recession", nameAr: "ركود حاد", probability: "10%", probabilityAr: "١٠٪", impact: "Revenue -25%", impactAr: "إيرادات -٢٥٪", cash12m: 3_200_000, status: "tight" },
  { nameEn: "Client Loss + Delayed Collections", nameAr: "خسارة عميل + تأخر تحصيل", probability: "8%", probabilityAr: "٨٪", impact: "Rev -30%, DSO +20d", impactAr: "إيرادات -٣٠٪، تحصيل +٢٠ يوم", cash12m: 2_800_000, status: "tight" },
  { nameEn: "Perfect Storm", nameAr: "العاصفة المثالية", probability: "2%", probabilityAr: "٢٪", impact: "Rev -40%, Costs +15%, DSO +30d", impactAr: "إيرادات -٤٠٪، تكاليف +١٥٪، تحصيل +٣٠ يوم", cash12m: 1_500_000, status: "critical" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────────

function FanTooltip({ active, payload, label, fmt }: { active?: boolean; payload?: any[]; label?: string; fmt: (n: number) => string }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs min-w-[160px] space-y-1">
      <p className="font-semibold">{label}</p>
      <p className="tabular-nums">
        <span className="text-muted-foreground">Median:</span>{" "}
        <span className="font-medium text-indigo-600 dark:text-indigo-400">{fmt(data.median * 1000)}</span>
      </p>
      <p className="tabular-nums text-muted-foreground">
        P5–P95: {fmt(data.p5 * 1000)} – {fmt(data.p95 * 1000)}
      </p>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function StressTestingPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { fmt, fmtAxis, selected: currCode } = useCurrency();

  const [simCount, setSimCount] = useState(1000);
  const [horizon, setHorizon] = useState(12);
  const [revVol, setRevVol] = useState(15);
  const [costVol, setCostVol] = useState(10);
  const [colMin, setColMin] = useState(15);
  const [colMax, setColMax] = useState(60);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => setRunning(false), 1500);
  };

  const chartData = FAN_DATA.map((d) => ({
    ...d,
    month: isAr ? d.monthAr : d.month,
    band_outer_lower: d.p5,
    band_outer_upper: d.p95 - d.p5,
    band_mid_lower: d.p10,
    band_mid_upper: d.p90 - d.p10,
    band_inner_lower: d.p25,
    band_inner_upper: d.p75 - d.p25,
  }));

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {isAr ? "اختبار ضغط السيولة" : "Liquidity Stress Testing"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "محاكاة مونت كارلو لنمذجة سيناريوهات السيولة القصوى"
                  : "Monte Carlo simulation to model extreme cash scenarios"}
              </p>
            </div>
          </div>
          <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800 w-fit">
            {isAr ? "١٬٠٠٠ محاكاة" : "1,000 Simulations"}
          </Badge>
        </div>

        {/* ── Simulation Controls ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {isAr ? "إعدادات المحاكاة" : "Simulation Controls"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Sim count */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <label className="text-sm font-medium">
                    {isAr ? "عدد المحاكاات" : "Simulation Count"}
                  </label>
                  <span className="text-sm font-bold tabular-nums">{simCount.toLocaleString()}</span>
                </div>
                <Slider min={100} max={10000} step={100} value={[simCount]} onValueChange={([v]) => setSimCount(v)} />
              </div>

              {/* Time horizon */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <label className="text-sm font-medium">
                    {isAr ? "الأفق الزمني" : "Time Horizon"}
                  </label>
                  <span className="text-sm font-bold tabular-nums">
                    {horizon} {isAr ? "شهر" : "months"}
                  </span>
                </div>
                <Slider min={3} max={24} step={1} value={[horizon]} onValueChange={([v]) => setHorizon(v)} />
              </div>

              {/* Revenue volatility */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <label className="text-sm font-medium">
                    {isAr ? "تقلب الإيرادات" : "Revenue Volatility"}
                  </label>
                  <span className="text-sm font-bold tabular-nums">±{revVol}%</span>
                </div>
                <Slider min={5} max={50} step={1} value={[revVol]} onValueChange={([v]) => setRevVol(v)} />
              </div>

              {/* Cost volatility */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <label className="text-sm font-medium">
                    {isAr ? "تقلب التكاليف" : "Cost Volatility"}
                  </label>
                  <span className="text-sm font-bold tabular-nums">±{costVol}%</span>
                </div>
                <Slider min={5} max={40} step={1} value={[costVol]} onValueChange={([v]) => setCostVol(v)} />
              </div>

              {/* Collection delay range */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <label className="text-sm font-medium">
                    {isAr ? "نطاق تأخر التحصيل" : "Collection Delay Range"}
                  </label>
                  <span className="text-sm font-bold tabular-nums">
                    {colMin}–{colMax} {isAr ? "يوم" : "days"}
                  </span>
                </div>
                <Slider min={5} max={90} step={5} value={[colMin, colMax]} onValueChange={([a, b]) => { setColMin(a); setColMax(b); }} />
              </div>

              {/* Run button */}
              <div className="flex items-end">
                <Button className="w-full gap-2" onClick={handleRun} disabled={running}>
                  <Play className="h-4 w-4" />
                  {running
                    ? isAr ? "جارٍ المحاكاة..." : "Running..."
                    : isAr ? "تشغيل المحاكاة" : "Run Simulation"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Results Summary KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-s-4 border-s-emerald-500">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {isAr ? "احتمال عجز نقدي" : "Cash Shortfall Probability"}
              </p>
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">8.3%</p>
              <Badge className="mt-1.5 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {isAr ? "مخاطر منخفضة" : "Low Risk"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-s-4 border-s-indigo-500">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {isAr ? "النقد المتوقع عند ١٢ شهر" : "Expected Cash at 12m"}
              </p>
              <p className="text-2xl font-bold tabular-nums">{fmt(5_200_000)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? `النطاق: ${fmtAxis(2_800_000)} – ${fmtAxis(7_600_000)}` : `Range: ${fmtAxis(2_800_000)} – ${fmtAxis(7_600_000)}`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-s-4 border-s-amber-500">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {isAr ? "أسوأ حالة (المئين الخامس)" : "Worst Case (5th Percentile)"}
              </p>
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{fmt(2_800_000)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "الحد الأدنى المتوقع" : "Floor estimate"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-s-4 border-s-blue-500">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {isAr ? "أفضل حالة (المئين ٩٥)" : "Best Case (95th Percentile)"}
              </p>
              <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{fmt(7_600_000)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "السقف المتوقع" : "Ceiling estimate"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Fan Chart ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold">
                {isAr ? "مخطط التوزيع الاحتمالي (مخطط المروحة)" : "Probability Distribution (Fan Chart)"}
              </CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-sm bg-indigo-500/15" />
                  P5–P95
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-sm bg-indigo-500/30" />
                  P10–P90
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-sm bg-indigo-500/50" />
                  P25–P75
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 border-t-2 border-indigo-600" />
                  {isAr ? "الوسيط" : "Median"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fanOuter" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(239 84% 67%)" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="hsl(239 84% 67%)" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="fanMid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(239 84% 67%)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(239 84% 67%)" stopOpacity={0.08} />
                    </linearGradient>
                    <linearGradient id="fanInner" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(239 84% 67%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(239 84% 67%)" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(240 5.9% 90% / 0.5)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v) => fmtAxis(v * 1000)}
                    domain={[2000, 8000]}
                  />
                  <Tooltip content={<FanTooltip fmt={fmt} />} key={currCode} />

                  {/* Outermost band: P5-P95 */}
                  <Area type="monotone" dataKey="p5" stackId="outer" stroke="none" fill="transparent" />
                  <Area type="monotone" dataKey="band_outer_upper" stackId="outer" stroke="none" fill="url(#fanOuter)" baseValue="dataMin" />

                  {/* Middle band: P10-P90 */}
                  <Area type="monotone" dataKey="p10" stackId="mid" stroke="none" fill="transparent" />
                  <Area type="monotone" dataKey="band_mid_upper" stackId="mid" stroke="none" fill="url(#fanMid)" baseValue="dataMin" />

                  {/* Inner band: P25-P75 */}
                  <Area type="monotone" dataKey="p25" stackId="inner" stroke="none" fill="transparent" />
                  <Area type="monotone" dataKey="band_inner_upper" stackId="inner" stroke="none" fill="url(#fanInner)" baseValue="dataMin" />

                  {/* Median line */}
                  <Area
                    type="monotone"
                    dataKey="median"
                    stroke="hsl(239 84% 67%)"
                    strokeWidth={2.5}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(239 84% 67%)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── Stress Scenarios Table ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {isAr ? "سيناريوهات الضغط" : "Stress Scenarios"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-start font-semibold text-muted-foreground text-xs">
                      {isAr ? "السيناريو" : "Scenario"}
                    </th>
                    <th className="py-2 px-3 text-center font-semibold text-muted-foreground text-xs">
                      {isAr ? "الاحتمال" : "Probability"}
                    </th>
                    <th className="py-2 px-3 text-center font-semibold text-muted-foreground text-xs">
                      {isAr ? "الأثر" : "Impact"}
                    </th>
                    <th className="py-2 px-3 text-center font-semibold text-muted-foreground text-xs">
                      {isAr ? "النقد عند ١٢ شهر" : "Cash at 12m"}
                    </th>
                    <th className="py-2 px-3 text-center font-semibold text-muted-foreground text-xs">
                      {isAr ? "الحالة" : "Status"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SCENARIOS.map((s) => (
                    <tr key={s.nameEn} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium">{isAr ? s.nameAr : s.nameEn}</td>
                      <td className="py-2.5 px-3 text-center tabular-nums">{isAr ? s.probabilityAr : s.probability}</td>
                      <td className="py-2.5 px-3 text-center text-muted-foreground text-xs">{isAr ? s.impactAr : s.impact}</td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-semibold">{fmt(s.cash12m)}</td>
                      <td className="py-2.5 px-3 text-center">
                        {s.status === "safe" && (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            {isAr ? "آمن" : "Safe"}
                          </Badge>
                        )}
                        {s.status === "tight" && (
                          <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {isAr ? "ضيق" : "Tight"}
                          </Badge>
                        )}
                        {s.status === "critical" && (
                          <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 gap-1">
                            <XCircle className="h-3 w-3" />
                            {isAr ? "حرج" : "Critical"}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Survival Analysis ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "تحليل البقاء" : "Survival Analysis"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isAr
                ? "بمعدل الحرق الحالي، تنجو شركتك في ١٠٠٪ من السيناريوهات المحاكاة لمدة ٦ أشهر على الأقل، و٩١.٧٪ من السيناريوهات على مدى ١٢ شهرًا كاملة."
                : "At current burn rate, your company survives 100% of simulated scenarios for at least 6 months, and 91.7% of scenarios for the full 12-month horizon."}
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">
                    {isAr ? "البقاء ٦ أشهر" : "6-Month Survival"}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">100%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: "100%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">
                    {isAr ? "البقاء ١٢ شهر" : "12-Month Survival"}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">91.7%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: "91.7%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── AI Insight ── */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                <Bot className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "تحليل الوكيل مُتوقّع" : "Agent Mutawaqi's Analysis"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "تحليل ذكي بناءً على ١٬٠٠٠ محاكاة" : "AI analysis based on 1,000 simulations"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
              {isAr ? (
                <p>
                  بناءً على ١٬٠٠٠ محاكاة، وضع السيولة لديكم <strong>متين</strong>. احتمال العجز النقدي ٨.٣٪ وهو ضمن الحدود المقبولة. المحرك الرئيسي للمخاطر: <strong>تأخر التحصيل (يفسر ٦٢٪ من التباين)</strong>. أوصي بتقليل أيام التحصيل من ٣٢ إلى ٢٥ يومًا لخفض احتمال العجز إلى أقل من ٥٪.
                </p>
              ) : (
                <p>
                  Based on 1,000 simulations, your liquidity position is <strong>robust</strong>. The 8.3% shortfall probability is well within acceptable limits. Main risk driver: <strong>collection delays (accounts for 62% of variance)</strong>. Recommend reducing DSO from 32 to 25 days to bring shortfall probability below 5%.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" className="gap-2 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]">
                <TrendingUp className="h-3.5 w-3.5" />
                {isAr ? "تحسين أيام التحصيل" : "Optimize Collection Days"}
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Flame className="h-3.5 w-3.5" />
                {isAr ? "تشغيل سيناريو مخصص" : "Run Custom Scenario"}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
