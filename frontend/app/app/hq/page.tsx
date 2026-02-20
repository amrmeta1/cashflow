"use client";

import { ArrowRightLeft, Building2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { EntityHealthGrid } from "@/components/hq/EntityHealthGrid";
import { ConsolidatedChart } from "@/components/hq/ConsolidatedChart";
import { GROUP_METRICS } from "@/components/hq/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSAR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}SAR ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}SAR ${(abs / 1_000).toFixed(0)}k`;
  return `${sign}SAR ${abs.toLocaleString("en-US")}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HQHubPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";

  const m = GROUP_METRICS;

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-7xl w-full mx-auto px-4 py-8 space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-indigo-400" />
              <h1 className="text-xl font-semibold tracking-tight">
                {isAr ? m.groupNameAr : m.groupName}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "لوحة تحكم المركز الرئيسي — رؤية موحدة لجميع الكيانات"
                : "HQ Command Center — Consolidated view across all subsidiaries"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            <span>
              {isAr
                ? `معدل الحرق الموحد: ${fmtSAR(m.burnRate)}/شهر`
                : `Consolidated Burn: ${fmtSAR(m.burnRate)}/mo`}
            </span>
          </div>
        </div>

        {/* ── AI Intercompany Transfer Alert ── */}
        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <ArrowRightLeft className="text-indigo-600 dark:text-indigo-400 w-6 h-6 animate-pulse shrink-0" />
          <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed flex-1">
            {isAr ? (
              <>
                <span className="font-semibold text-indigo-900 dark:text-indigo-100">تنبيه مستشار AI:</span>{" "}
                تحتاج{" "}
                <span className="font-bold text-indigo-900 dark:text-indigo-100">الماجد للمقاولات</span>{" "}
                إلى{" "}
                <span className="font-bold">SAR 1.25M</span>{" "}
                للرواتب الأسبوع القادم وتقترب من حد السحب على المكشوف.{" "}
                <span className="font-bold text-indigo-900 dark:text-indigo-100">الماجد للعقارات</span>{" "}
                لديها{" "}
                <span className="font-bold">SAR 5.2M</span>{" "}
                نقداً خاملاً. يُوصى بتحويل داخلي فوري لتوفير ما يقارب{" "}
                <span className="font-bold text-emerald-700 dark:text-emerald-300">SAR 45,000</span>{" "}
                من فوائد الاقتراض قصير الأجل.
              </>
            ) : (
              <>
                <span className="font-semibold text-indigo-900 dark:text-indigo-100">Mustashar AI Insight:</span>{" "}
                <span className="font-bold text-indigo-900 dark:text-indigo-100">Al-Majd Contracting</span>{" "}
                requires{" "}
                <span className="font-bold">SAR 1.25M</span>{" "}
                for payroll next week and is nearing its overdraft limit.{" "}
                <span className="font-bold text-indigo-900 dark:text-indigo-100">Al-Majd Real Estate</span>{" "}
                has{" "}
                <span className="font-bold">SAR 5.2M</span>{" "}
                idle cash. Recommend an immediate Intercompany Transfer to save{" "}
                <span className="font-bold text-emerald-700 dark:text-emerald-300">~SAR 45,000</span>{" "}
                in short-term bank interest.
              </>
            )}
          </p>
          <Button
            size="sm"
            className="ms-auto shrink-0 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            ⚡ {isAr ? "تنفيذ التحويل (SAR 1.25M)" : "Execute Transfer (SAR 1.25M)"}
          </Button>
        </div>

        {/* ── Group KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Consolidated Cash */}
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "النقد الموحد" : "Consolidated Cash"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold tabular-nums tracking-tighter text-emerald-600 dark:text-emerald-400">
                {fmtSAR(m.consolidatedCash)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isAr ? "عبر ٤ كيانات" : "Across 4 entities"}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Total Active Debt */}
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "إجمالي الديون النشطة" : "Total Active Debt"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold tabular-nums tracking-tighter text-destructive">
                {fmtSAR(m.totalDebt)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isAr ? "تسهيلات بنكية" : "Bank facilities"}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Idle Capital */}
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "رأس المال الخامل" : "Idle Capital"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold tabular-nums tracking-tighter text-amber-600 dark:text-amber-400">
                {fmtSAR(m.idleCapital)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isAr ? "عائد 0٪" : "Earning 0% yield"}
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Group Runway */}
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "المدرج الزمني للمجموعة" : "Group Runway"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold tabular-nums tracking-tighter">
                {m.groupRunwayMonths}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  {isAr ? "شهراً" : "Months"}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isAr ? "بمعدل الحرق الحالي" : "At current burn rate"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Entity Health Matrix ── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            {isAr ? "مصفوفة صحة الكيانات" : "Entity Health Matrix"}
          </h2>
          <EntityHealthGrid isAr={isAr} />
        </div>

        {/* ── Consolidated Cash Stacked Bar Chart ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold">
                {isAr
                  ? "النقد الموحد للمجموعة — آخر ٦ أشهر"
                  : "Consolidated Group Cash — Last 6 Months"}
              </CardTitle>
              {/* Legend */}
              <div className="flex items-center flex-wrap gap-3 text-[11px] text-muted-foreground">
                {[
                  { color: "bg-emerald-500", label: isAr ? "العقارات" : "Real Estate" },
                  { color: "bg-blue-500",    label: isAr ? "التجزئة"  : "Retail" },
                  { color: "bg-slate-400",   label: isAr ? "اللوجستيات" : "Logistics" },
                  { color: "bg-destructive", label: isAr ? "المقاولات" : "Contracting" },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-sm ${color}`} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ConsolidatedChart isAr={isAr} />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
