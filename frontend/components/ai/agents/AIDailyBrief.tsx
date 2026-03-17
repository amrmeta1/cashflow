"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { DriversPopover } from "./DriversPopover";
import type { DailyBriefData } from "@/lib/api/daily-brief-api";

interface AIDailyBriefProps {
  data?: DailyBriefData | null;
  loading?: boolean;
  onOpenCases?: () => void;
  onOpenSimulation?: () => void;
}

export function AIDailyBrief({ data, loading = false, onOpenCases, onOpenSimulation }: AIDailyBriefProps) {
  const { locale } = useI18n();
  const { fmt } = useCurrency();
  const isAr = locale === "ar";

  if (loading) {
    return (
      <Card className="border-s-4 border-s-indigo-500 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-lg font-semibold">
            {isAr ? "ملخص الخزينة اليومي" : "Daily Treasury Brief"}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-s-4 border-s-indigo-500 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-lg font-semibold">
            {isAr ? "ملخص الخزينة اليومي" : "Daily Treasury Brief"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "لا توجد بيانات كافية لإنشاء الملخص اليومي."
                : "Insufficient data to generate daily brief."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastUpdatedFormatted = new Date(data.lastUpdated).toLocaleString(
    isAr ? "ar-SA" : "en-GB",
    { dateStyle: "short", timeStyle: "short" }
  );

  return (
    <Card className="border-s-4 border-s-indigo-500 shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-lg font-semibold">
          {isAr ? "ملخص الخزينة اليومي" : "Daily Treasury Brief"}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 mt-3" suppressHydrationWarning>
          <Badge variant="secondary" className="text-xs">
            {isAr ? "الثقة" : "Confidence"}: {data.confidence}%
          </Badge>
          <Badge variant="outline" className="text-xs">
            {isAr ? "جودة البيانات" : "Data Quality"}: {data.dataQuality}%
          </Badge>
          <span className="text-xs text-muted-foreground">
            {isAr ? "آخر تحديث:" : "Last updated:"} {lastUpdatedFormatted}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        {/* Key Metrics Grid */}
        {(data.cash_position !== undefined || data.runway_days !== undefined || 
          data.daily_burn_rate !== undefined || data.inflows_30d !== undefined || 
          data.outflows_30d !== undefined) && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pb-3 border-b border-border/50">
            {data.cash_position !== undefined && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isAr ? "الوضع النقدي" : "Cash Position"}
                </p>
                <p className="text-sm font-bold tabular-nums">{fmt(data.cash_position)}</p>
              </div>
            )}
            {data.runway_days !== undefined && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isAr ? "أيام التشغيل" : "Runway Days"}
                </p>
                <p className="text-sm font-bold tabular-nums">{data.runway_days} {isAr ? "يوم" : "days"}</p>
              </div>
            )}
            {data.daily_burn_rate !== undefined && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isAr ? "معدل الحرق اليومي" : "Daily Burn Rate"}
                </p>
                <p className="text-sm font-bold tabular-nums">{fmt(data.daily_burn_rate)}</p>
              </div>
            )}
            {data.inflows_30d !== undefined && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isAr ? "التدفقات الداخلة (30 يوم)" : "Inflows (30d)"}
                </p>
                <p className="text-sm font-bold tabular-nums text-emerald-600">{fmt(data.inflows_30d)}</p>
              </div>
            )}
            {data.outflows_30d !== undefined && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isAr ? "التدفقات الخارجة (30 يوم)" : "Outflows (30d)"}
                </p>
                <p className="text-sm font-bold tabular-nums text-rose-600">{fmt(data.outflows_30d)}</p>
              </div>
            )}
          </div>
        )}

        {/* Top Risk, Opportunity, and Recommended Action */}
        {(data.top_risk || data.top_opportunity || data.recommended_action) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-3 border-b border-border/50">
            {data.top_risk && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isAr ? "أهم مخاطرة" : "Top Risk"}
                </p>
                <p className="text-xs leading-relaxed text-rose-600">{data.top_risk}</p>
              </div>
            )}
            {data.top_opportunity && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isAr ? "أهم فرصة" : "Top Opportunity"}
                </p>
                <p className="text-xs leading-relaxed text-emerald-600">{data.top_opportunity}</p>
              </div>
            )}
            {data.recommended_action && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isAr ? "الإجراء الموصى به" : "Recommended Action"}
                </p>
                <p className="text-xs leading-relaxed text-blue-600">{data.recommended_action}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {isAr ? "المخاطر" : "Risks"}
            </h3>
            <ul className="space-y-1 text-xs">
              {data.risks && data.risks.length > 0 ? (
                data.risks.map((r: any) => (
                  <li key={r.id} className="flex items-start gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{isAr ? r.textAr : r.textEn}</span>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground italic text-xs">
                  {isAr ? "لا توجد مخاطر حالياً" : "No risks identified"}
                </li>
              )}
            </ul>
          </section>
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {isAr ? "الفرص" : "Opportunities"}
            </h3>
            <ul className="space-y-1 text-xs">
              {data.opportunities && data.opportunities.length > 0 ? (
                data.opportunities.map((o: any) => (
                  <li key={o.id} className="flex items-start gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{isAr ? o.textAr : o.textEn}</span>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground italic text-xs">
                  {isAr ? "لا توجد فرص حالياً" : "No opportunities identified"}
                </li>
              )}
            </ul>
          </section>
        </div>
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isAr ? "التوصيات" : "Recommendations"}
          </h3>
          <ul className="space-y-1.5 text-xs">
            {data.recommendations && data.recommendations.length > 0 ? (
              data.recommendations.map((rec: any) => (
                <li key={rec.id} className="flex items-start justify-between gap-2">
                  <span className="leading-relaxed">{isAr ? rec.textAr : rec.textEn}</span>
                  <DriversPopover>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] shrink-0 px-2">
                      {isAr ? "لماذا؟" : "Why?"}
                    </Button>
                  </DriversPopover>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground italic text-xs">
                {isAr ? "لا توجد توصيات حالياً" : "No recommendations available"}
              </li>
            )}
          </ul>
        </section>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={onOpenCases}>
            {isAr ? "عرض الحالات" : "View Cases"}
          </Button>
          <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={onOpenSimulation}>
            {isAr ? "تشغيل محاكاة" : "Run Simulation"}
          </Button>
          <Button size="sm" variant="outline" className="text-[11px] h-7">
            {isAr ? "تصدير التقرير" : "Export Report"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
