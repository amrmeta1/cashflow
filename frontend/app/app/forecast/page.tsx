"use client";

import Link from "next/link";
import { TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { MasterForecastChart, type ForecastDataPoint } from "@/components/forecast/MasterForecastChart";

// ── Master forecast mock data (12 weeks) ──────────────────────────────────────
const MASTER_DATA: ForecastDataPoint[] = [
  { week: "Week 1",  actual: 480_000, forecast: null },
  { week: "Week 2",  actual: 510_000, forecast: null },
  { week: "Week 3",  actual: 495_000, forecast: null },
  { week: "Week 4",  actual: 430_000, forecast: null },
  { week: "Week 5",  actual: 460_000, forecast: null },
  { week: "Week 6",  actual: 450_000, forecast: null },
  { week: "Week 7",  actual: 450_000, forecast: 450_000 },
  { week: "Week 8",  actual: null,    forecast: 390_000 },
  { week: "Week 9",  actual: null,    forecast: 210_000 },
  { week: "Week 10", actual: null,    forecast: -45_000, isAnomaly: true,
    aiNote: "⚠️ Critical Drop: Overlapping Q1 VAT payment (SAR 180k) and Payroll. Reallocation recommended." },
  { week: "Week 11", actual: null,    forecast: 80_000 },
  { week: "Week 12", actual: null,    forecast: 175_000 },
];

// ── Main page ──────────────────────────────────────────────────────────────
export default function ForecastPage() {
  const { locale, dir } = useI18n();
  const { profile } = useCompany();
  const isAr = locale === "ar";
  const curr = profile.currency || "SAR";

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── Page title ── */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isAr ? "توقعات السيولة الرئيسية" : "Master AI Cash Flow Forecast"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "عرض مرئي للتدفقات النقدية الفعلية والمتوقعة على مدى ١٢ أسبوعاً."
              : "Visual overview of historical actuals vs. AI-projected cash positions over 12 weeks."}
          </p>
        </div>

        {/* ── AI Alert Banner ── */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 flex items-start sm:items-center flex-col sm:flex-row gap-4">
          <TrendingDown className="text-destructive w-6 h-6 animate-pulse shrink-0" />
          <p className="text-sm text-destructive leading-relaxed">
            {isAr ? (
              <><span className="font-semibold">تنبيه مستشار AI:</span> تم رصد عجز نقدي متوقع بقيمة{" "}
              <span className="font-bold">{curr} 45,000</span> في الأسبوع العاشر. يُنصح فوراً بتأجيل مدفوعات الموردين غير الحرجة.</>
            ) : (
              <><span className="font-semibold">Mustashar AI Alert:</span> Projected cash shortfall of{" "}
              <span className="font-bold">{curr} 45,000</span> detected in Week 10. Immediate action required to defer non-critical vendor payments.</>
            )}
          </p>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="ms-auto shrink-0 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Link href="/app/scenario-planner">
              ⚡ {isAr ? "تشغيل محاكي الاحتمالات" : "Launch What-If Simulator"}
            </Link>
          </Button>
        </div>

        {/* ── Master Chart ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold">
                {isAr ? "توقعات السيولة الرئيسية (١٢ أسبوعاً)" : "Master Cash Flow Forecast (12 Weeks)"}
              </CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 border-t-2 border-primary" />
                  {isAr ? "الفعلي" : "Actuals"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 border-t-2 border-dashed border-amber-500" />
                  {isAr ? "التوقع" : "Forecast"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <MasterForecastChart data={MASTER_DATA} isAr={isAr} />
          </CardContent>
        </Card>

        {/* ── 4 KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "الرصيد الحالي" : "Current Cash"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p suppressHydrationWarning className="text-xl font-bold tabular-nums tracking-tighter">{curr} 450,000</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "معدل الحرق (٣٠ يوم)" : "30-Day Burn Rate"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p suppressHydrationWarning className="text-xl font-bold tabular-nums tracking-tighter text-destructive">-{curr} 145k/mo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "أدنى رصيد متوقع" : "Projected Low"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p suppressHydrationWarning className="text-xl font-bold tabular-nums tracking-tighter text-destructive">-{curr} 45,000</p>
              <p className="text-xs text-muted-foreground mt-0.5">{isAr ? "الأسبوع ١٠" : "Week 10"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAr ? "المدرج الزمني النقدي" : "Cash Runway"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold tabular-nums tracking-tighter text-amber-600 dark:text-amber-400">
                2.4 {isAr ? "شهر" : "Months"}
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
