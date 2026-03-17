"use client";

import Link from "next/link";
import {
  Shield,
  TrendingUp,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Mail,
  LayoutDashboard,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Banknote,
  CalendarDays,
  Timer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getMockDailyBrief } from "@/lib/mocks/mock-data";
import { cn } from "@/lib/utils";

const HEALTH_SCORE = 82;

const QUICK_STATS = {
  cashPosition: 1_245_000,
  netFlow7d: 42_300,
  overdueReceivables: 28_000,
  runwayMonths: 14.2,
};

interface TimelineEvent {
  time: string;
  timeAr: string;
  textEn: string;
  textAr: string;
  type: "neutral" | "positive" | "negative" | "info" | "success";
  amount?: string;
}

const TIMELINE: TimelineEvent[] = [
  { time: "08:15", timeAr: "٠٨:١٥", textEn: "Opening balance SAR 1,181,200", textAr: "رصيد الافتتاح ١٬١٨١٬٢٠٠ ر.س", type: "neutral" },
  { time: "09:30", timeAr: "٠٩:٣٠", textEn: "Client B payment received", textAr: "تم استلام دفعة العميل ب", type: "positive", amount: "+67,000" },
  { time: "11:00", timeAr: "١١:٠٠", textEn: "Ooredoo auto-debit processed", textAr: "تم تنفيذ الخصم التلقائي لأوريدو", type: "negative", amount: "-3,200" },
  { time: "14:22", timeAr: "١٤:٢٢", textEn: "FX rate alert: USD/SAR moved +0.3%", textAr: "تنبيه سعر الصرف: USD/SAR تحرك +٠.٣٪", type: "info" },
  { time: "16:00", timeAr: "١٦:٠٠", textEn: "Daily reconciliation completed ✓", textAr: "تمت المطابقة اليومية ✓", type: "success" },
  { time: "17:30", timeAr: "١٧:٣٠", textEn: "Closing balance SAR 1,245,000", textAr: "رصيد الإقفال ١٬٢٤٥٬٠٠٠ ر.س", type: "neutral" },
];

function healthColor(score: number) {
  if (score >= 80) return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-300 dark:border-emerald-800" };
  if (score >= 60) return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-300 dark:border-amber-800" };
  return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", border: "border-red-300 dark:border-red-800" };
}

function healthLabel(score: number, isAr: boolean) {
  if (score >= 80) return isAr ? "جيد" : "Good";
  if (score >= 60) return isAr ? "متوسط" : "Fair";
  return isAr ? "ضعيف" : "Poor";
}

const timelineDotColor: Record<TimelineEvent["type"], string> = {
  neutral: "bg-zinc-400",
  positive: "bg-emerald-500",
  negative: "bg-rose-500",
  info: "bg-indigo-500",
  success: "bg-emerald-500",
};

export default function DailyBriefPage() {
  const { locale, dir } = useI18n();
  const { fmt } = useCurrency();
  const isAr = locale === "ar";
  const hc = healthColor(HEALTH_SCORE);
  const brief = getMockDailyBrief().data;
  const greeting = isAr ? brief.greeting_ar : brief.greeting_en;

  const expectedInflow = 23_000;
  const expectedOutflow = 0;
  const maxBar = Math.max(expectedInflow, expectedOutflow, 1);

  return (
    <div dir={dir} className="h-full overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 md:px-6 md:py-10 flex flex-col gap-8">

        {/* ═══ 1. BRIEF HEADER ═══ */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-emerald-50/50 dark:from-indigo-950/30 dark:via-background dark:to-emerald-950/20 border border-border/50 p-6 md:p-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
            {isAr ? "ملخص يومي" : "Daily Brief"}
          </p>
          <p suppressHydrationWarning className="text-sm text-muted-foreground mb-3">
            {isAr
              ? "الثلاثاء، ٢٤ فبراير ٢٠٢٦"
              : "Tuesday, February 24, 2026"}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            {isAr
              ? "ملخصك المالي اليومي من وكلاء تدفق"
              : "Your daily financial snapshot from Tadfuq AI Agents"}
          </p>
          <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold", hc.bg, hc.text, hc.border)}>
            <span className="relative flex h-2 w-2">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", HEALTH_SCORE >= 80 ? "bg-emerald-400" : HEALTH_SCORE >= 60 ? "bg-amber-400" : "bg-red-400")} />
              <span className={cn("relative inline-flex rounded-full h-2 w-2", HEALTH_SCORE >= 80 ? "bg-emerald-500" : HEALTH_SCORE >= 60 ? "bg-amber-500" : "bg-red-500")} />
            </span>
            {isAr
              ? `مؤشر الصحة: ${HEALTH_SCORE}/100 — ${healthLabel(HEALTH_SCORE, true)}`
              : `Health Score: ${HEALTH_SCORE}/100 — ${healthLabel(HEALTH_SCORE, false)}`}
          </div>
          {brief.items?.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {brief.items.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span aria-hidden>{item.icon}</span>
                  <span>{isAr ? item.text_ar : item.text_en}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ═══ 2. AGENT SECTIONS ═══ */}

        {/* ── Raqib ── */}
        <Card className={cn("border-s-4 border-s-emerald-500 shadow-sm")}>
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "رقيب — الحارس" : "Raqib — The Watchman"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "ماذا حدث أمس" : "What Happened Yesterday"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-sm">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                </span>
                <span>{isAr ? "تم استلام ٦٧,٠٠٠ ر.س من العميل ب — قبل يومين من الموعد" : `${fmt(67_000)} received from Client B — 2 days early`}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <CircleDot className="h-3 w-3 text-zinc-500" />
                </span>
                <span>{isAr ? "تم تنفيذ الخصم التلقائي لأوريدو ٣,٢٠٠ ر.س" : `Ooredoo auto-debit ${fmt(3_200)} processed`}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                </span>
                <span>{isAr ? "الفاتورة #INV-2847 من المورد X متأخرة ٧ أيام — ٢٨,٠٠٠ ر.س" : `Invoice #INV-2847 from Supplier X is now 7 days overdue — ${fmt(28_000)}`}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm font-medium">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                  <Banknote className="h-3 w-3 text-indigo-600" />
                </span>
                <span>{isAr ? "أُغلق الرصيد النقدي عند ١,٢٤٥,٠٠٠ ر.س (+٦٣,٨٠٠ ر.س مقارنة بالأمس)" : `Cash balance closed at ${fmt(1_245_000)} (+${fmt(63_800)} vs yesterday)`}</span>
              </li>
            </ul>
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                {isAr
                  ? "غير معتاد: فاتورة المرافق أعلى بنسبة ٤٠٪ من متوسط ٣ أشهر"
                  : "Unusual: Utility bill was 40% higher than 3-month average"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Mutawaqi ── */}
        <Card className={cn("border-s-4 border-s-indigo-500 shadow-sm")}>
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "متوقع — المتنبئ" : "Mutawaqi — The Forecaster"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "ماذا نتوقع اليوم" : "What To Expect Today"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 px-4 py-3">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  {isAr ? "التدفقات المتوقعة" : "Expected Inflows"}
                </p>
                <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {fmt(expectedInflow)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "إيرادات خدمات — ثقة ٨٥٪" : "Service Revenue — 85% confidence"}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50/60 dark:bg-zinc-900/20 border border-zinc-200/60 dark:border-zinc-800/40 px-4 py-3">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  {isAr ? "المصروفات المتوقعة" : "Expected Outflows"}
                </p>
                <p className="text-lg font-bold tabular-nums text-zinc-600 dark:text-zinc-400">
                  {fmt(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "لا توجد مدفوعات مجدولة" : "No scheduled payments"}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-200/40 dark:border-indigo-900/30 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                  {isAr ? "الرصيد المتوقع نهاية اليوم" : "Predicted End-of-Day Balance"}
                </p>
                <p className="text-lg font-bold tabular-nums">{fmt(1_268_000)}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            </div>

            <div className="flex items-center gap-2.5 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                {isAr
                  ? "الرواتب خلال ٣ أيام (٨٩,٠٠٠ ر.س) — الأموال كافية"
                  : `Payroll in 3 days (${fmt(89_000)}) — funds are sufficient`}
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>

            {/* Mini forecast bar */}
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                {isAr ? "تدفقات اليوم" : "Today's Flow"}
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12 shrink-0">{isAr ? "داخل" : "In"}</span>
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(expectedInflow / maxBar) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums font-medium w-16 text-end">{fmt(expectedInflow)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12 shrink-0">{isAr ? "خارج" : "Out"}</span>
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-500 transition-all"
                      style={{ width: `${(expectedOutflow / maxBar) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums font-medium w-16 text-end">{fmt(expectedOutflow)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Mustashar ── */}
        <Card className={cn("border-s-4 border-s-amber-500 shadow-sm")}>
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "مستشار — المستشار" : "Mustashar — The Advisor"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr ? "الإجراءات الموصى بها" : "Recommended Actions"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {/* Action 1 — HIGH */}
            <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/10 px-4 py-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-500 text-white border-rose-500 text-[10px] px-1.5 py-0 shrink-0 mt-0.5">
                  {isAr ? "عالي" : "HIGH"}
                </Badge>
                <p className="text-sm leading-snug">
                  {isAr
                    ? "متابعة الفاتورة المتأخرة #INV-2847 (٢٨,٠٠٠ ر.س). إرسال تذكير واتساب عبر CashCollect."
                    : `Follow up on overdue invoice #INV-2847 (${fmt(28_000)}). Send WhatsApp reminder via CashCollect.`}
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400">
                {isAr ? "أرسل الآن" : "Send Now"}
              </Button>
            </div>

            {/* Action 2 — MEDIUM */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/10 px-4 py-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <Badge className="bg-amber-500 text-white border-amber-500 text-[10px] px-1.5 py-0 shrink-0 mt-0.5">
                  {isAr ? "متوسط" : "MED"}
                </Badge>
                <p className="text-sm leading-snug">
                  {isAr
                    ? "فكّر في تحويل ٢٠٠,٠٠٠ ر.س إلى وديعة عالية العائد. حساب التوفير الحالي يحقق عائداً أقل من السوق."
                    : `Consider moving ${fmt(200_000)} to high-yield deposit. Current savings account earning below market rate.`}
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400">
                {isAr ? "محاكاة" : "Simulate"}
              </Button>
            </div>

            {/* Action 3 — LOW */}
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/10 px-4 py-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <Badge className="bg-emerald-500 text-white border-emerald-500 text-[10px] px-1.5 py-0 shrink-0 mt-0.5">
                  {isAr ? "منخفض" : "LOW"}
                </Badge>
                <p className="text-sm leading-snug">
                  {isAr
                    ? "إقرار ضريبة القيمة المضافة مستحق خلال ١٢ يوماً. جميع المستندات جاهزة."
                    : "VAT filing due in 12 days. All documents are ready."}
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400">
                {isAr ? "مراجعة" : "Review"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ═══ 3. QUICK STATS STRIP ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                {isAr ? "الرصيد النقدي" : "Cash Position"}
              </p>
              <p className="text-lg font-bold tabular-nums">{fmt(QUICK_STATS.cashPosition)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                {isAr ? "صافي التدفق ٧ أيام" : "7-Day Net Flow"}
              </p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                +{fmt(QUICK_STATS.netFlow7d)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                {isAr ? "مستحقات متأخرة" : "Overdue Receivables"}
              </p>
              <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {fmt(QUICK_STATS.overdueReceivables)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
                {isAr ? "فترة التشغيل" : "Runway"}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {QUICK_STATS.runwayMonths} {isAr ? "شهر" : "months"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ═══ 4. YESTERDAY'S ACTIVITY TIMELINE ═══ */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "نشاط أمس" : "Yesterday's Activity"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="relative">
              {/* vertical line */}
              <div className="absolute top-0 bottom-0 start-[7px] w-px bg-border" />

              <div className="space-y-4">
                {TIMELINE.map((ev, i) => (
                  <div key={i} className="relative flex items-start gap-4">
                    <div className={cn("relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-background shrink-0", timelineDotColor[ev.type])} />
                    <div className="flex-1 flex items-baseline gap-3">
                      <span className="text-xs tabular-nums font-mono text-muted-foreground w-12 shrink-0">
                        {isAr ? ev.timeAr : ev.time}
                      </span>
                      <span className="text-sm">
                        {isAr ? ev.textAr : ev.textEn}
                        {ev.amount && (
                          <span className={cn(
                            "ms-1.5 text-xs font-semibold tabular-nums",
                            ev.amount.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {ev.amount}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ 5. FOOTER ═══ */}
        <div className="flex flex-col sm:flex-row-reverse items-center justify-between gap-4 pt-2 pb-6 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {isAr ? "مشاركة عبر البريد" : "Share via Email"}
            </Button>
            <Link href="/liquidity/dashboard">
              <Button size="sm" className="h-8 text-xs gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" />
                {isAr ? "فتح لوحة المعلومات" : "Open Full Dashboard"}
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            {isAr
              ? "تم إنشاء هذا الملخص الساعة ٨:٠٠ صباحاً"
              : "This brief was generated at 08:00 AM"}
          </p>
        </div>

      </div>
    </div>
  );
}
