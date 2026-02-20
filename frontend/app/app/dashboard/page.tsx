"use client";

import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Bell,
  Sparkles,
  BellOff,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SafeCashCard } from "@/components/dashboard/safe-cash-card";
import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useCompany } from "@/contexts/CompanyContext";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const placeholderForecast = [
  { day: "Day 1",  balance: 125000 },
  { day: "Day 5",  balance: 118000 },
  { day: "Day 10", balance: 132000 },
  { day: "Day 15", balance: 128000 },
  { day: "Day 20", balance: 145000 },
  { day: "Day 25", balance: 139000 },
  { day: "Day 30", balance: 152340 },
];

function TrendBadge({
  pct,
  positive,
  isAr,
}: {
  pct: string;
  positive: boolean | null;
  isAr: boolean;
}) {
  const neutral = positive === null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
        neutral
          ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          : positive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
          : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
      )}
    >
      {neutral ? (
        <Minus className="h-3 w-3" />
      ) : positive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {pct}
      <span className="font-normal opacity-70">
        {isAr ? " من الشهر الماضي" : " vs last mo."}
      </span>
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/60">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, locale, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        {formatCurrency(payload[0].value, currency, locale)}
      </p>
    </div>
  );
}

const DATE_RANGES = ["7d", "30d", "90d", "12m"] as const;
type DateRange = (typeof DATE_RANGES)[number];

export default function DashboardPage() {
  const { t, locale, dir } = useI18n();
  const { currentTenant } = useTenant();
  const { profile } = useCompany();
  const isAr = locale === "ar";
  const curr = profile.currency || "SAR";
  const taxAuth = profile.taxAuthority || "ZATCA";
  const loc = locale === "ar" ? "ar-SA" : "en-SA";

  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const RANGE_LABELS: Record<DateRange, string> = {
    "7d":  isAr ? "٧ أيام" : "Last 7 days",
    "30d": isAr ? "٣٠ يومًا" : "Last 30 days",
    "90d": isAr ? "٩٠ يومًا" : "Last 90 days",
    "12m": isAr ? "١٢ شهرًا" : "Last 12 months",
  };

  return (
    <div dir={dir} className="flex flex-col gap-5 p-5 md:p-6 overflow-y-auto h-full">

      {/* ── Top action bar ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {currentTenant?.name ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r} value={r} className="text-xs">
                  {RANGE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {isAr ? "تصدير" : "Export"}
          </Button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Total Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t.dashboard.totalBalance}
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-1.5">
              <span suppressHydrationWarning className="text-sm font-normal text-muted-foreground">{curr}</span>
              <span className="text-2xl font-semibold tracking-tight tabular-nums">
                152,340
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t.dashboard.cashPosition}</p>
            <div className="mt-2">
              <TrendBadge pct="+2.1%" positive={true} isAr={isAr} />
            </div>
          </CardContent>
        </Card>

        {/* Income */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t.dashboard.income}
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-950/40">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-1.5">
              <span suppressHydrationWarning className="text-sm font-normal text-muted-foreground">{curr}</span>
              <span className="text-2xl font-semibold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-500">
                48,200
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAr ? "هذا الشهر" : "This month"}
            </p>
            <div className="mt-2">
              <TrendBadge pct="+5.2%" positive={true} isAr={isAr} />
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t.dashboard.expenses}
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-50 dark:bg-rose-950/40">
              <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline gap-1.5">
              <span suppressHydrationWarning className="text-sm font-normal text-muted-foreground">{curr}</span>
              <span className="text-2xl font-semibold tracking-tight tabular-nums text-rose-600 dark:text-rose-500">
                31,850
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAr ? "هذا الشهر" : "This month"}
            </p>
            <div className="mt-2">
              <TrendBadge pct="-3.1%" positive={false} isAr={isAr} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── AI Cash Ring-Fencing ── */}
      <SafeCashCard isAr={isAr} currency={curr} taxAuthority={taxAuth} />

      {/* ── Forecast chart ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <div>
            <CardTitle className="text-sm font-semibold">{t.dashboard.forecast}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr ? "توقع الرصيد للـ ٣٠ يومًا القادمة" : "30-day projected cash balance"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={placeholderForecast}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="dashBalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(243 75% 59%)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="hsl(243 75% 59%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(240 5.9% 90%)"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  content={
                    <ChartTooltip locale={loc} currency={curr} />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(243 75% 59%)"
                  strokeWidth={2}
                  fill="url(#dashBalGrad)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Alerts + Daily Brief ── */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4 px-4">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">{t.dashboard.alerts}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <EmptyState
              icon={BellOff}
              title={isAr ? "لا توجد تنبيهات" : "All clear"}
              description={
                isAr
                  ? "لا توجد تنبيهات نشطة في الوقت الحالي."
                  : "No active alerts at this time. You're on track."
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-4 px-4">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">{t.dashboard.dailyBrief}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <EmptyState
              icon={Sparkles}
              title={isAr ? "ملخصك اليومي" : "Your daily brief"}
              description={
                isAr
                  ? "سيظهر ملخص الذكاء الاصطناعي هنا بمجرد استيراد المعاملات."
                  : "Your AI brief will appear here once transactions are imported."
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
