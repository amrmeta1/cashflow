"use client";

import { CalendarDays, Clock, AlertTriangle, Sparkles, FileText, ArrowDownRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from "recharts";

// ── Mock Data ───────────────────────────────────────────────────────────────────

const DEADLINE = new Date("2026-03-31T23:59:59");

function getCountdown() {
  const now = new Date();
  const diff = DEADLINE.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, percent: 100 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const quarterStart = new Date("2026-01-01T00:00:00");
  const total = DEADLINE.getTime() - quarterStart.getTime();
  const elapsed = now.getTime() - quarterStart.getTime();
  const percent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  return { days, hours, percent };
}

type FilingRow = {
  period: string;
  periodAr: string;
  type: "VAT" | "Zakat";
  dueDate: string;
  dueDateAr: string;
  status: "filed" | "upcoming" | "overdue";
  amount: number;
};

const FILINGS: FilingRow[] = [
  { period: "Q4 2025", periodAr: "الربع الرابع 2025", type: "VAT", dueDate: "31 Jan 2026", dueDateAr: "31 يناير 2026", status: "filed", amount: 22_350 },
  { period: "Q1 2026", periodAr: "الربع الأول 2026", type: "VAT", dueDate: "31 Mar 2026", dueDateAr: "31 مارس 2026", status: "upcoming", amount: 18_500 },
  { period: "Q2 2026", periodAr: "الربع الثاني 2026", type: "VAT", dueDate: "30 Jun 2026", dueDateAr: "30 يونيو 2026", status: "upcoming", amount: 0 },
  { period: "Q3 2026", periodAr: "الربع الثالث 2026", type: "VAT", dueDate: "30 Sep 2026", dueDateAr: "30 سبتمبر 2026", status: "upcoming", amount: 0 },
  { period: "Q4 2026", periodAr: "الربع الرابع 2026", type: "VAT", dueDate: "31 Dec 2026", dueDateAr: "31 ديسمبر 2026", status: "upcoming", amount: 0 },
  { period: "FY 2025", periodAr: "السنة المالية 2025", type: "Zakat", dueDate: "30 Apr 2026", dueDateAr: "30 أبريل 2026", status: "upcoming", amount: 42_000 },
];

function getChartData(isAr: boolean) {
  const months = isAr
    ? ["سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر", "يناير", "فبراير"]
    : ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  return [
    { month: months[0], collected: 28_000, paid: 19_500, net: 8_500 },
    { month: months[1], collected: 31_200, paid: 22_400, net: 8_800 },
    { month: months[2], collected: 26_800, paid: 18_100, net: 8_700 },
    { month: months[3], collected: 34_500, paid: 24_200, net: 10_300 },
    { month: months[4], collected: 29_100, paid: 20_600, net: 8_500 },
    { month: months[5], collected: 32_400, paid: 21_900, net: 10_500 },
  ];
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function statusBadge(status: FilingRow["status"], isAr: boolean) {
  const map = {
    filed: {
      label: isAr ? "تم التقديم" : "Filed",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    upcoming: {
      label: isAr ? "قادم" : "Upcoming",
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    },
    overdue: {
      label: isAr ? "متأخر" : "Overdue",
      className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    },
  };
  const { label, className } = map[status];
  return <Badge variant="outline" className={cn("text-[11px] font-medium", className)}>{label}</Badge>;
}

// ── Custom Chart Tooltip ────────────────────────────────────────────────────────

function VatTooltip({ active, payload, label, fmt, isAr }: { active?: boolean; payload?: any[]; label?: string; fmt: (n: number) => string; isAr: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border shadow-sm rounded-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry: any) => {
        const labels: Record<string, string> = isAr
          ? { collected: "محصّلة", paid: "مدفوعة", net: "صافي" }
          : { collected: "Collected", paid: "Paid", net: "Net" };
        return (
          <div key={entry.dataKey} className="flex justify-between gap-4 mb-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
              {labels[entry.dataKey] || entry.dataKey}
            </span>
            <span className="font-mono tabular-nums" suppressHydrationWarning>
              {fmt(entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────

export default function ZakatVatPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { profile } = useCompany();
  const { fmt } = useCurrency();

  const { days, hours, percent } = getCountdown();
  const chartData = getChartData(isAr);

  return (
    <div dir={dir} className="flex flex-col gap-5 p-5 md:p-6 overflow-y-auto h-full">

      {/* ══ HEADER ══ */}
      <div className="flex items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
            <CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isAr ? "تقويم الزكاة وضريبة القيمة المضافة" : "Zakat & VAT Calendar"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? `${profile.taxAuthorityAr} · إدارة الإقرارات والمواعيد النهائية`
                : `${profile.taxAuthority} · Manage filings & deadlines`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {isAr ? "تصدير التقرير" : "Export Report"}
          </Button>
        </div>
      </div>

      {/* ══ COUNTDOWN CARD ══ */}
      <Card className="shadow-sm border-border/50 overflow-hidden bg-gradient-to-br from-violet-50/60 to-transparent dark:from-violet-950/20">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {isAr ? "الموعد النهائي القادم" : "Next Filing Deadline"}
                </p>
              </div>
              <p className="text-lg font-bold mt-1">
                {isAr ? "إقرار ضريبة القيمة المضافة — الربع الأول 2026" : "Q1 2026 VAT Return"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isAr ? "تاريخ الاستحقاق: 31 مارس 2026" : "Due: 31 March 2026"}
              </p>

              <div className="mt-4 w-full max-w-md">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span>{isAr ? "بداية الربع" : "Quarter Start"}</span>
                  <span>{isAr ? "الموعد النهائي" : "Deadline"}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-600 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isAr ? `${percent}% من الفترة انقضت` : `${percent}% of period elapsed`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <p className="text-4xl font-bold tabular-nums text-violet-700 dark:text-violet-300">{days}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{isAr ? "يوم" : "Days"}</p>
              </div>
              <span className="text-2xl font-light text-muted-foreground/40">:</span>
              <div className="text-center">
                <p className="text-4xl font-bold tabular-nums text-violet-700 dark:text-violet-300">{hours}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{isAr ? "ساعة" : "Hours"}</p>
              </div>
              <Badge variant="outline" className="ms-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium">
                <CheckCircle2 className="h-3 w-3 me-1" />
                {isAr ? "في الموعد" : "On Track"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══ KPI ROW ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: isAr ? "التزام ضريبة القيمة المضافة" : "VAT Liability",
            value: 18_500,
            sub: isAr ? "محصّلة − مدفوعة" : "Collected − Paid",
            color: "text-amber-600 dark:text-amber-400",
            dot: "bg-amber-500",
            icon: ArrowUpRight,
            gradient: "bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-950/20",
          },
          {
            label: isAr ? "مخصص الزكاة" : "Zakat Provision",
            value: 42_000,
            sub: isAr ? "تقدير سنوي" : "Annual Estimate",
            color: "text-emerald-600 dark:text-emerald-400",
            dot: "bg-emerald-500",
            icon: CalendarDays,
            gradient: "bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/20",
          },
          {
            label: isAr ? "استرداد معلّق" : "Refund Pending",
            value: 3_200,
            sub: isAr ? "طلب مقدم" : "Claim Submitted",
            color: "text-blue-600 dark:text-blue-400",
            dot: "bg-blue-500",
            icon: ArrowDownRight,
            gradient: "bg-gradient-to-br from-blue-50/60 to-transparent dark:from-blue-950/20",
          },
        ].map((kpi) => (
          <Card key={kpi.label} className={cn("shadow-sm border-border/50 overflow-hidden", kpi.gradient)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("w-2 h-2 rounded-full shrink-0", kpi.dot)} />
                <p className="text-[11px] text-muted-foreground font-medium leading-none">{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground leading-none" suppressHydrationWarning>
                {fmt(kpi.value)}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                <kpi.icon className="h-4 w-4 text-muted-foreground/40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ══ MAIN CONTENT: Filing Calendar + Chart side-by-side on XL ══ */}
      <div className="flex flex-col xl:flex-row gap-5">

        {/* ── FILING CALENDAR TABLE ── */}
        <Card className="flex-1 min-w-0 overflow-hidden shadow-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {isAr ? "جدول الإقرارات" : "Filing Calendar"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-2.5 ps-5 text-start font-semibold text-muted-foreground min-w-[120px]">
                      {isAr ? "الفترة" : "Period"}
                    </th>
                    <th className="p-2.5 text-start font-semibold text-muted-foreground min-w-[80px]">
                      {isAr ? "النوع" : "Type"}
                    </th>
                    <th className="p-2.5 text-start font-semibold text-muted-foreground min-w-[120px]">
                      {isAr ? "تاريخ الاستحقاق" : "Due Date"}
                    </th>
                    <th className="p-2.5 text-start font-semibold text-muted-foreground min-w-[90px]">
                      {isAr ? "الحالة" : "Status"}
                    </th>
                    <th className="p-2.5 pe-5 text-end font-semibold text-muted-foreground min-w-[100px]">
                      {isAr ? "المبلغ" : "Amount"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FILINGS.map((f, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 ps-5 font-medium">{isAr ? f.periodAr : f.period}</td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold",
                            f.type === "VAT"
                              ? "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20"
                              : "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20"
                          )}
                        >
                          {f.type === "VAT" ? (isAr ? "ض.ق.م" : "VAT") : (isAr ? "زكاة" : "Zakat")}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-muted-foreground">{isAr ? f.dueDateAr : f.dueDate}</td>
                      <td className="p-2.5">{statusBadge(f.status, isAr)}</td>
                      <td className="p-2.5 pe-5 text-end font-mono tabular-nums" suppressHydrationWarning>
                        {f.amount === 0 ? "—" : fmt(f.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── VAT BREAKDOWN CHART ── */}
        <Card className="flex-1 min-w-0 shadow-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {isAr ? "تحليل ضريبة القيمة المضافة — آخر 6 أشهر" : "VAT Breakdown — Last 6 Months"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="currentColor" opacity={0.05} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v: number) => {
                    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                    return String(v);
                  }}
                />
                <Tooltip content={<VatTooltip fmt={fmt} isAr={isAr} />} />
                <Legend
                  verticalAlign="top"
                  height={32}
                  formatter={(value: string) => {
                    const labels: Record<string, string> = isAr
                      ? { collected: "محصّلة", paid: "مدفوعة", net: "صافي الالتزام" }
                      : { collected: "Collected", paid: "Paid", net: "Net Liability" };
                    return <span className="text-[11px] text-muted-foreground">{labels[value] || value}</span>;
                  }}
                />
                <Bar dataKey="collected" fill="#8b5cf6" radius={[3, 3, 0, 0]} barSize={20} />
                <Bar dataKey="paid" fill="#a78bfa" radius={[3, 3, 0, 0]} barSize={20} opacity={0.6} />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ══ AI INSIGHT CARD ══ */}
      <Card className="shadow-sm border-border/50 overflow-hidden bg-gradient-to-br from-blue-50/60 to-transparent dark:from-blue-950/20 border-blue-200/50 dark:border-blue-800/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 shrink-0 mt-0.5">
              <Sparkles className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold">
                  {isAr ? "وكيل المستشار" : "Mustashar Agent"}
                </p>
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                  {isAr ? "رؤية ذكية" : "AI Insight"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr
                  ? `التزام ضريبة القيمة المضافة للربع الأول هو ${fmt(18_500)}. تم تخصيص هذا المبلغ تلقائياً من ميزانية التشغيل. الموعد النهائي للتقديم بعد ${days} يوماً. نسبة ضريبة القيمة المضافة الفعلية لديك 14.2% — أقل من المعدل القطاعي البالغ 15%. تأكد من تسوية فواتير الموردين قبل نهاية الربع لتجنب تعديلات لاحقة.`
                  : `Your Q1 VAT liability is ${fmt(18_500)}. I've automatically reserved this from your operating budget. Filing deadline is in ${days} days. Your effective VAT rate is 14.2% — below the sector average of 15%. Ensure supplier invoices are reconciled before quarter-end to avoid post-filing adjustments.`}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  {isAr ? "مراجعة التخصيص" : "Review Allocation"}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  {isAr ? "تفاصيل الحساب" : "View Breakdown"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
