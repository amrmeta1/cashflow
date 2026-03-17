"use client";

import { useState } from "react";
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  ArrowRight,
  Bot,
  Tag,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
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
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategorySlice {
  nameEn: string;
  nameAr: string;
  percent: number;
  amount: number;
  color: string;
}

interface Transaction {
  id: string;
  date: string;
  dateAr: string;
  descEn: string;
  descAr: string;
  amount: number;
  categoryEn: string;
  categoryAr: string;
  confidence: number;
  status: "auto" | "review" | "manual";
}

interface PendingReview {
  id: string;
  descEn: string;
  descAr: string;
  amount: number;
  bestGuessEn: string;
  bestGuessAr: string;
  confidence: number;
  altEn: string[];
  altAr: string[];
}

interface CategoryRule {
  pattern: string;
  categoryEn: string;
  categoryAr: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const CATEGORIES: CategorySlice[] = [
  { nameEn: "Payroll", nameAr: "الرواتب", percent: 34, amount: 89000, color: "#6366f1" },
  { nameEn: "Suppliers", nameAr: "الموردون", percent: 22, amount: 57200, color: "#3b82f6" },
  { nameEn: "Utilities", nameAr: "المرافق", percent: 8, amount: 20800, color: "#f59e0b" },
  { nameEn: "Rent", nameAr: "الإيجار", percent: 6, amount: 15000, color: "#f43f5e" },
  { nameEn: "Revenue - Services", nameAr: "إيرادات - خدمات", percent: 18, amount: 46800, color: "#10b981" },
  { nameEn: "Revenue - Products", nameAr: "إيرادات - منتجات", percent: 7, amount: 18200, color: "#14b8a6" },
  { nameEn: "Government (VAT/GOSI)", nameAr: "حكومية (ضريبة/تأمينات)", percent: 5, amount: 13000, color: "#a855f7" },
];

const RECENT_TX: Transaction[] = [
  { id: "1", date: "Feb 24", dateAr: "٢٤ فبراير", descEn: "Client B payment", descAr: "دفعة العميل ب", amount: 67000, categoryEn: "Revenue - Services", categoryAr: "إيرادات - خدمات", confidence: 98, status: "auto" },
  { id: "2", date: "Feb 24", dateAr: "٢٤ فبراير", descEn: "Ooredoo debit", descAr: "خصم أوريدو", amount: -3200, categoryEn: "Utilities", categoryAr: "المرافق", confidence: 96, status: "auto" },
  { id: "3", date: "Feb 23", dateAr: "٢٣ فبراير", descEn: "Project Alpha invoice", descAr: "فاتورة مشروع ألفا", amount: 23000, categoryEn: "Revenue - Services", categoryAr: "إيرادات - خدمات", confidence: 99, status: "auto" },
  { id: "4", date: "Feb 22", dateAr: "٢٢ فبراير", descEn: "Office rent", descAr: "إيجار المكتب", amount: -15000, categoryEn: "Rent", categoryAr: "الإيجار", confidence: 97, status: "auto" },
  { id: "5", date: "Feb 22", dateAr: "٢٢ فبراير", descEn: "Amazon Web Services", descAr: "أمازون ويب سيرفيسز", amount: -4200, categoryEn: "IT & Software", categoryAr: "تقنية وبرمجيات", confidence: 89, status: "auto" },
  { id: "6", date: "Feb 21", dateAr: "٢١ فبراير", descEn: "Supplier X materials", descAr: "مواد المورد X", amount: -28000, categoryEn: "Suppliers", categoryAr: "الموردون", confidence: 94, status: "auto" },
  { id: "7", date: "Feb 20", dateAr: "٢٠ فبراير", descEn: "Bank fee", descAr: "رسوم بنكية", amount: -150, categoryEn: "Banking Fees", categoryAr: "رسوم بنكية", confidence: 72, status: "review" },
  { id: "8", date: "Feb 20", dateAr: "٢٠ فبراير", descEn: "GOSI payment", descAr: "دفعة التأمينات", amount: -12000, categoryEn: "Government", categoryAr: "حكومية", confidence: 99, status: "auto" },
  { id: "9", date: "Feb 19", dateAr: "١٩ فبراير", descEn: "ATM withdrawal", descAr: "سحب صراف آلي", amount: -5000, categoryEn: "Uncategorized", categoryAr: "غير مصنف", confidence: 45, status: "manual" },
  { id: "10", date: "Feb 18", dateAr: "١٨ فبراير", descEn: "Transfer from Trading", descAr: "تحويل من شركة التجارة", amount: 80000, categoryEn: "Intercompany", categoryAr: "بين الشركات", confidence: 91, status: "auto" },
];

const LEARNING_DATA = [
  { monthEn: "Month 1", monthAr: "الشهر ١", accuracy: 78 },
  { monthEn: "Month 2", monthAr: "الشهر ٢", accuracy: 85 },
  { monthEn: "Month 3", monthAr: "الشهر ٣", accuracy: 91 },
  { monthEn: "Month 4", monthAr: "الشهر ٤", accuracy: 94.2 },
];

const PENDING_REVIEWS: PendingReview[] = [
  { id: "p1", descEn: "Bank fee — Feb 20", descAr: "رسوم بنكية — ٢٠ فبراير", amount: -150, bestGuessEn: "Banking Fees", bestGuessAr: "رسوم بنكية", confidence: 72, altEn: ["Miscellaneous", "Service Charges"], altAr: ["متنوعة", "رسوم خدمات"] },
  { id: "p2", descEn: "ATM withdrawal — Feb 19", descAr: "سحب صراف — ١٩ فبراير", amount: -5000, bestGuessEn: "Petty Cash", bestGuessAr: "نثريات", confidence: 45, altEn: ["Owner Drawings", "Uncategorized"], altAr: ["سحوبات المالك", "غير مصنف"] },
  { id: "p3", descEn: "Wire transfer #8821", descAr: "حوالة رقم ٨٨٢١", amount: -7500, bestGuessEn: "Suppliers", bestGuessAr: "الموردون", confidence: 68, altEn: ["Intercompany", "Consulting Fees"], altAr: ["بين الشركات", "رسوم استشارية"] },
];

const RULES: CategoryRule[] = [
  { pattern: "OOREDOO*", categoryEn: "Utilities", categoryAr: "المرافق" },
  { pattern: "GOSI*", categoryEn: "Government", categoryAr: "حكومية" },
  { pattern: "*RENT*", categoryEn: "Rent", categoryAr: "الإيجار" },
  { pattern: "AMAZON*", categoryEn: "IT & Software", categoryAr: "تقنية وبرمجيات" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function confidenceColor(c: number) {
  if (c >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (c >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function confidenceBg(c: number) {
  if (c >= 90) return "bg-emerald-500/10";
  if (c >= 70) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function StatusBadge({ status, isAr }: { status: "auto" | "review" | "manual"; isAr: boolean }) {
  if (status === "auto")
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {isAr ? "تلقائي" : "Auto"}
      </Badge>
    );
  if (status === "review")
    return (
      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
        <AlertTriangle className="h-3 w-3" />
        {isAr ? "مراجعة" : "Review"}
      </Badge>
    );
  return (
    <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 gap-1">
      <XCircle className="h-3 w-3" />
      {isAr ? "يدوي" : "Manual"}
    </Badge>
  );
}

function DonutTooltip({ active, payload, isAr, fmt }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md min-w-[140px]">
      <p className="font-semibold mb-0.5">{isAr ? d.nameAr : d.nameEn}</p>
      <p className="text-muted-foreground">{d.percent}% · {fmt(d.amount)}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SmartCategorizationPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { fmt } = useCurrency();

  const [approved, setApproved] = useState<Set<string>>(new Set());

  const learningChartData = LEARNING_DATA.map((d) => ({
    month: isAr ? d.monthAr : d.monthEn,
    accuracy: d.accuracy,
  }));

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <Brain className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {isAr ? "التصنيف الذكي" : "Smart Categorization"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "تصنيف المعاملات تلقائياً بالذكاء الاصطناعي"
                  : "AI-powered automatic transaction classification"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-sm px-3 py-1 gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              94.2% {isAr ? "دقة" : "Accuracy"}
            </Badge>
            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-sm px-3 py-1 gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              1,247 {isAr ? "مصنف" : "Categorized"}
            </Badge>
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-sm px-3 py-1 gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              18 {isAr ? "تحتاج مراجعة" : "Need Review"}
            </Badge>
          </div>
        </div>

        {/* ── Accuracy Dashboard (3 cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {isAr ? "الدقة الإجمالية" : "Overall Accuracy"}
                </p>
                <Sparkles className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#6366f1" strokeWidth="3" strokeDasharray={`${94.2 * 0.974} 100`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
                    94.2%
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">94.2%</p>
                  <p className="text-xs text-muted-foreground">
                    {isAr ? "من المعاملات مصنفة بشكل صحيح" : "of transactions correctly classified"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {isAr ? "مصنف تلقائياً" : "Auto-categorized"}
                </p>
                <RefreshCw className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold tabular-nums">1,229 <span className="text-base font-normal text-muted-foreground">/ 1,247</span></p>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: "98.6%" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">98.6% {isAr ? "نسبة الأتمتة" : "automation rate"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {isAr ? "تصحيحات يدوية" : "Manual Corrections"}
                </p>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold tabular-nums">18</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "هذا الشهر — يتعلم النظام من كل تصحيح" : "This month — the AI learns from each correction"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Category Breakdown (Donut) ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {isAr ? "توزيع التصنيفات" : "Category Breakdown"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="w-full lg:w-1/2 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CATEGORIES}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="percent"
                    >
                      {CATEGORIES.map((c) => (
                        <Cell key={c.nameEn} fill={c.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip isAr={isAr} fmt={fmt} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-1/2 space-y-2">
                {CATEGORIES.map((c) => (
                  <div key={c.nameEn} className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-sm flex-1 truncate">{isAr ? c.nameAr : c.nameEn}</span>
                    <span className="text-sm font-medium tabular-nums">{c.percent}%</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-28 text-end">
                      {fmt(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Recent Categorizations Table ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {isAr ? "التصنيفات الأخيرة" : "Recent Categorizations"}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-start py-2 px-2 font-medium">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="text-start py-2 px-2 font-medium">{isAr ? "الوصف" : "Description"}</th>
                  <th className="text-end py-2 px-2 font-medium">{isAr ? "المبلغ" : "Amount"}</th>
                  <th className="text-start py-2 px-2 font-medium">{isAr ? "التصنيف AI" : "AI Category"}</th>
                  <th className="text-end py-2 px-2 font-medium">{isAr ? "الثقة" : "Confidence"}</th>
                  <th className="text-center py-2 px-2 font-medium">{isAr ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_TX.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">
                      {isAr ? tx.dateAr : tx.date}
                    </td>
                    <td className="py-2.5 px-2 font-medium">{isAr ? tx.descAr : tx.descEn}</td>
                    <td className={cn(
                      "py-2.5 px-2 text-end font-semibold tabular-nums whitespace-nowrap",
                      tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
                    )}>
                      {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                    </td>
                    <td className="py-2.5 px-2">
                      <Badge variant="outline" className="text-xs font-normal">
                        {isAr ? tx.categoryAr : tx.categoryEn}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2 text-end">
                      <span className={cn(
                        "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                        confidenceColor(tx.confidence),
                        confidenceBg(tx.confidence),
                      )}>
                        {tx.confidence}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <StatusBadge status={tx.status} isAr={isAr} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ── Learning Progress ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "تقدم التعلم" : "Learning Progress"}
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr ? "الذكاء الاصطناعي يتحسن كل شهر مع استخدامك" : "The AI improves each month as you use it"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="w-full lg:w-1/2 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={learningChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                            <p className="font-semibold">{label}</p>
                            <p className="tabular-nums text-indigo-600 dark:text-indigo-400">{payload[0].value}%</p>
                          </div>
                        );
                      }}
                    />
                    <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "var(--background)", stroke: "#6366f1", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-1/2 grid grid-cols-2 gap-3">
                {LEARNING_DATA.map((d, i) => (
                  <div
                    key={d.monthEn}
                    className={cn(
                      "rounded-lg border p-3 text-center",
                      i === LEARNING_DATA.length - 1
                        ? "border-indigo-500/40 bg-indigo-500/5"
                        : "border-border/50",
                    )}
                  >
                    <p className="text-xs text-muted-foreground">{isAr ? d.monthAr : d.monthEn}</p>
                    <p className={cn(
                      "text-xl font-bold tabular-nums mt-1",
                      i === LEARNING_DATA.length - 1 ? "text-indigo-600 dark:text-indigo-400" : "",
                    )}>
                      {d.accuracy}%
                    </p>
                    {i === LEARNING_DATA.length - 1 && (
                      <Badge className="mt-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[10px]">
                        {isAr ? "الحالي" : "Current"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Pending Review Queue ── */}
        <Card className="border-amber-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "قائمة المراجعة المعلقة" : "Pending Review Queue"}
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr ? "معاملات تحتاج مراجعة بشرية" : "Transactions that need human review"}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {PENDING_REVIEWS.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border p-4 space-y-3 transition-all",
                  approved.has(item.id)
                    ? "border-emerald-500/30 bg-emerald-500/5 opacity-60"
                    : "border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10",
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{isAr ? item.descAr : item.descEn}</p>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      {fmt(item.amount)}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs font-semibold tabular-nums rounded-md px-2 py-0.5",
                    confidenceColor(item.confidence),
                    confidenceBg(item.confidence),
                  )}>
                    {item.confidence}%
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{isAr ? "أفضل تخمين:" : "Best guess:"}</span>
                  <Badge variant="outline" className="text-xs">{isAr ? item.bestGuessAr : item.bestGuessEn}</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  {(isAr ? item.altAr : item.altEn).map((alt) => (
                    <Badge key={alt} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10">
                      {alt}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={approved.has(item.id)}
                    onClick={() => setApproved((prev) => new Set(prev).add(item.id))}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {approved.has(item.id)
                      ? isAr ? "تمت الموافقة" : "Approved"
                      : isAr ? "موافقة" : "Approve"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={approved.has(item.id)}>
                    <Tag className="h-3 w-3" />
                    {isAr ? "تغيير التصنيف" : "Change"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Category Rules (user-defined overrides) ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "قواعد التصنيف" : "Category Rules"}
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr ? "قواعد مخصصة تتجاوز التصنيف التلقائي" : "User-defined overrides for automatic categorization"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {RULES.map((rule) => (
                <div key={rule.pattern} className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3">
                  <code className="text-xs bg-muted rounded px-2 py-1 font-mono">{rule.pattern}</code>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Badge variant="outline">{isAr ? rule.categoryAr : rule.categoryEn}</Badge>
                  <span className="ms-auto">
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      {isAr ? "نشط" : "Active"}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-xs">
              <Tag className="h-3.5 w-3.5" />
              {isAr ? "إضافة قاعدة" : "Add Rule"}
            </Button>
          </CardContent>
        </Card>

        {/* ── AI Insight ── */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20 shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isAr ? "رؤية من المُستشار" : "Insight from Mustashar"}
                </p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {isAr
                    ? "دقة التصنيف تحسنت بنسبة ١٦٪ خلال ٤ أشهر. أنصح بمراجعة الـ ١٨ معاملة المعلقة لتسريع تعلم النظام. إضافة قاعدة لتحويلات ATM ستخفض المراجعات اليدوية بنسبة ٤٠٪."
                    : "Categorization accuracy improved 16% over 4 months. I recommend reviewing the 18 pending transactions to accelerate AI learning. Adding a rule for ATM transfers would reduce manual reviews by ~40%."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
