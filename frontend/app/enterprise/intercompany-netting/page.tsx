"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Bot,
  Zap,
  Building2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Payment {
  from: string;
  fromAr: string;
  to: string;
  toAr: string;
  amount: number;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const ENTITIES = [
  { en: "HQ", ar: "المقر الرئيسي" },
  { en: "Construction", ar: "الإنشاءات" },
  { en: "Trading", ar: "التجارة" },
  { en: "Tech", ar: "التقنية" },
  { en: "Properties", ar: "العقارات" },
];

const BEFORE_PAYMENTS: Payment[] = [
  { from: "HQ", fromAr: "المقر", to: "Construction", toAr: "الإنشاءات", amount: 150000 },
  { from: "HQ", fromAr: "المقر", to: "Tech", toAr: "التقنية", amount: 70000 },
  { from: "Construction", fromAr: "الإنشاءات", to: "HQ", toAr: "المقر", amount: 80000 },
  { from: "Construction", fromAr: "الإنشاءات", to: "Trading", toAr: "التجارة", amount: 50000 },
  { from: "Trading", fromAr: "التجارة", to: "HQ", toAr: "المقر", amount: 60000 },
  { from: "Trading", fromAr: "التجارة", to: "Tech", toAr: "التقنية", amount: 30000 },
  { from: "Tech", fromAr: "التقنية", to: "HQ", toAr: "المقر", amount: 40000 },
  { from: "Tech", fromAr: "التقنية", to: "Trading", toAr: "التجارة", amount: 20000 },
  { from: "Properties", fromAr: "العقارات", to: "HQ", toAr: "المقر", amount: 15000 },
  { from: "HQ", fromAr: "المقر", to: "Properties", toAr: "العقارات", amount: 25000 },
  { from: "Construction", fromAr: "الإنشاءات", to: "Properties", toAr: "العقارات", amount: 20000 },
  { from: "Trading", fromAr: "التجارة", to: "Construction", toAr: "الإنشاءات", amount: 20000 },
];

const AFTER_PAYMENTS: Payment[] = [
  { from: "HQ", fromAr: "المقر", to: "Construction", toAr: "الإنشاءات", amount: 40000 },
  { from: "HQ", fromAr: "المقر", to: "Properties", toAr: "العقارات", amount: 10000 },
  { from: "HQ", fromAr: "المقر", to: "Tech", toAr: "التقنية", amount: 10000 },
  { from: "Trading", fromAr: "التجارة", to: "HQ", toAr: "المقر", amount: 10000 },
  { from: "Construction", fromAr: "الإنشاءات", to: "Trading", toAr: "التجارة", amount: 10000 },
];

const MATRIX = [
  [0, 150000, 0, 70000, 25000],
  [80000, 0, 50000, 0, 20000],
  [60000, 20000, 0, 30000, 0],
  [40000, 0, 20000, 0, 0],
  [15000, 0, 0, 0, 0],
];

const NET_POSITIONS = [
  { en: "HQ", ar: "المقر", net: -60000 },
  { en: "Construction", ar: "الإنشاءات", net: -30000 },
  { en: "Trading", ar: "التجارة", net: 0 },
  { en: "Tech", ar: "التقنية", net: 60000 },
  { en: "Properties", ar: "العقارات", net: 30000 },
];

// ── Page ────────────────────────────────────────────────────────────────────────

export default function IntercompanyNettingPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { fmt } = useCurrency();

  const [executed, setExecuted] = useState(false);

  const fmtK = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toLocaleString();
  };

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <ArrowLeftRight className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {isAr ? "المقاصة بين الشركات" : "Intercompany Netting"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "تقليل عدد المدفوعات وتكاليف المعاملات بين كيانات المجموعة"
                  : "Reduce payment count and transaction costs between group entities"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Netting Summary KPIs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-s-4 border-s-muted-foreground/30">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {isAr ? "إجمالي الالتزامات" : "Gross Obligations"}
              </p>
              <p className="text-2xl font-bold tabular-nums">{fmt(580_000)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "١٢ دفعة" : "12 payments"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-s-4 border-s-emerald-500">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {isAr ? "صافي الالتزامات" : "Net Obligations"}
              </p>
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(230_000)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "٥ دفعات فقط" : "5 payments only"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-s-4 border-s-violet-500 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {isAr ? "التوفير" : "Savings"}
              </p>
              <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">{fmt(350_000)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "٧ دفعات أقل — تخفيض ٦٠٪" : "7 fewer payments — 60% reduction"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Before vs After ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Before Netting */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "قبل المقاصة" : "Before Netting"}
                </CardTitle>
                <Badge variant="outline" className="text-xs text-rose-600 border-rose-300 dark:text-rose-400 dark:border-rose-800">
                  {isAr ? "١٢ دفعة" : "12 payments"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {BEFORE_PAYMENTS.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 text-sm">
                  <span className="font-medium min-w-[90px] truncate">{isAr ? p.fromAr : p.from}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  <span className="font-medium min-w-[90px] truncate">{isAr ? p.toAr : p.to}</span>
                  <span className="ms-auto tabular-nums text-xs text-muted-foreground font-semibold shrink-0">
                    {fmt(p.amount)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* After Netting */}
          <Card className="border-emerald-200 dark:border-emerald-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "بعد المقاصة" : "After Netting"}
                </CardTitle>
                <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800">
                  {isAr ? "٥ دفعات" : "5 payments"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {AFTER_PAYMENTS.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 px-3 py-2 text-sm">
                  <span className="font-medium min-w-[90px] truncate">{isAr ? p.fromAr : p.from}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-medium min-w-[90px] truncate">{isAr ? p.toAr : p.to}</span>
                  <span className="ms-auto tabular-nums text-xs text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                    {fmt(p.amount)}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-center gap-3 pt-4 pb-2">
                <Badge variant="outline" className="text-xs text-rose-600 border-rose-300 dark:text-rose-400 dark:border-rose-800 line-through">
                  {isAr ? "١٢ دفعة" : "12 payments"}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800">
                  {isAr ? "٥ دفعات" : "5 payments"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Netting Matrix ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {isAr ? "مصفوفة المقاصة" : "Netting Matrix"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isAr ? "ما يدين به كل كيان لكل كيان آخر" : "What each entity owes each other"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-start font-semibold text-muted-foreground text-xs">
                      {isAr ? "من \\ إلى" : "From \\ To"}
                    </th>
                    {ENTITIES.map((e) => (
                      <th key={e.en} className="py-2 px-3 text-center font-semibold text-xs">
                        {isAr ? e.ar : e.en}
                      </th>
                    ))}
                    <th className="py-2 px-3 text-center font-semibold text-xs text-muted-foreground">
                      {isAr ? "الصافي" : "Net"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ENTITIES.map((rowEntity, ri) => (
                    <tr key={rowEntity.en} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-semibold text-xs">{isAr ? rowEntity.ar : rowEntity.en}</td>
                      {MATRIX[ri].map((val, ci) => (
                        <td
                          key={ci}
                          className={cn(
                            "py-2 px-3 text-center tabular-nums text-xs",
                            ri === ci && "bg-muted/50 text-muted-foreground",
                            val > 0 && ri !== ci && "font-medium",
                          )}
                        >
                          {ri === ci ? "—" : val > 0 ? `${fmtK(val)}` : "—"}
                        </td>
                      ))}
                      <td className={cn(
                        "py-2 px-3 text-center tabular-nums text-xs font-bold",
                        NET_POSITIONS[ri].net < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : NET_POSITIONS[ri].net > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground",
                      )}>
                        {NET_POSITIONS[ri].net === 0
                          ? "0"
                          : `${NET_POSITIONS[ri].net > 0 ? "+" : ""}${fmtK(NET_POSITIONS[ri].net)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Execute Netting ── */}
        <Card className="border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-50/30 to-transparent dark:from-violet-950/10">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">
                  {isAr ? "تنفيذ دورة المقاصة" : "Execute Netting Cycle"}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {isAr ? "الدورة القادمة:" : "Next scheduled:"}{" "}
                    <span className="font-semibold text-foreground">
                      {isAr ? "١ مارس ٢٠٢٦" : "March 1, 2026"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {isAr ? "آخر تنفيذ:" : "Last executed:"}{" "}
                    <span className="font-semibold text-foreground">
                      {isAr ? "١ فبراير ٢٠٢٦" : "February 1, 2026"}
                    </span>
                    {" — "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {isAr
                        ? `وفّر ${fmt(280_000)} (٨ دفعات ألغيت)`
                        : `Saved ${fmt(280_000)} (8 payments eliminated)`}
                    </span>
                  </span>
                </div>
              </div>
              <Button
                className="gap-2 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]"
                onClick={() => setExecuted(true)}
                disabled={executed}
              >
                <ArrowLeftRight className="h-4 w-4" />
                {executed
                  ? isAr ? "تم التنفيذ" : "Executed"
                  : isAr ? "تنفيذ دورة المقاصة" : "Execute Netting Cycle"}
              </Button>
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
                  {isAr ? "رؤية الوكيل مُستشار" : "Mustashar's Insight"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "تحليل ذكي لفرص المقاصة" : "AI-powered netting optimization analysis"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
              {isAr ? (
                <p>
                  بتحليل ١٢ دفعة بين ٥ كيانات، تم تقليصها إلى ٥ دفعات صافية فقط — <strong>توفير ٦٠٪ في عدد المعاملات</strong> و{fmt(350_000)} في حجم التحويلات. المقر الرئيسي هو أكبر دافع صافي ({fmt(60_000)}). أنصح بجدولة المقاصة أسبوعياً بدلاً من شهرياً لتقليل مخاطر الائتمان بين الشركات.
                </p>
              ) : (
                <p>
                  Analyzing 12 payments across 5 entities, I reduced them to just 5 net payments — <strong>saving 60% in transaction count</strong> and {fmt(350_000)} in transfer volume. HQ is the largest net payer ({fmt(60_000)}). I recommend scheduling netting weekly instead of monthly to reduce intercompany credit risk.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" className="gap-2 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]">
                <Zap className="h-3.5 w-3.5" />
                {isAr ? "جدولة المقاصة الأسبوعية" : "Schedule Weekly Netting"}
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Building2 className="h-3.5 w-3.5" />
                {isAr ? "عرض تفاصيل الكيانات" : "View Entity Details"}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
