"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getTenantId } from "@/lib/api/client";
import { useInsights } from "@/lib/hooks/useInsights";
import { AlertTriangle, TrendingUp, Lightbulb, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/api/insights-api";
import type { LucideIcon } from "lucide-react";

function getConfidenceVariant(confidence: number): "default" | "secondary" | "destructive" {
  if (confidence >= 80) return "default";
  if (confidence >= 60) return "secondary";
  return "destructive";
}

interface InsightCardProps {
  insight: Insight;
}

function InsightCard({ insight }: InsightCardProps) {
  const { fmt } = useCurrency();
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <div className="rounded-md bg-muted/30 p-3 space-y-2">
      <p className="text-sm font-medium leading-tight">
        {isAr ? insight.titleAr : insight.title}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tabular-nums">
          {fmt(insight.impact ?? 0)}
        </span>
        <Badge variant={getConfidenceVariant(insight.confidence)} className="text-xs">
          {insight.confidence}%
        </Badge>
      </div>
    </div>
  );
}

interface InsightSectionProps {
  title: string;
  titleAr: string;
  icon: LucideIcon;
  insights: Insight[];
  borderColor: string;
  loading?: boolean;
}

function InsightSection({ 
  title, 
  titleAr, 
  icon: Icon, 
  insights, 
  borderColor,
  loading = false,
}: InsightSectionProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <div className={cn("rounded-lg border p-4", borderColor)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-semibold">
          {isAr ? titleAr : title}
        </h3>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-md bg-muted/30 p-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-muted-foreground">
            {isAr ? `لا توجد ${titleAr}` : `No ${title.toLowerCase()} detected`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {insights.slice(0, 5).map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AIInsightsPanel() {
  const { locale, dir } = useI18n();
  const tenantId = getTenantId();
  const isAr = locale === "ar";

  const { data, isLoading, isError, refetch, isRefetching } = useInsights(tenantId);

  if (isError) {
    return (
      <Card className="border-s-4 border-s-purple-500 shadow-sm" dir={dir}>
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-lg font-semibold">
            {isAr ? "رؤى الخزينة الذكية" : "AI Treasury Insights"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {isAr ? "تعذر تحميل الرؤى" : "Unable to load insights"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-s-4 border-s-purple-500 shadow-sm" dir={dir}>
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {isAr ? "رؤى الخزينة الذكية" : "AI Treasury Insights"}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightSection
            title="Risks"
            titleAr="المخاطر"
            icon={AlertTriangle}
            insights={data?.risks || []}
            borderColor="border-s-rose-500"
            loading={isLoading}
          />
          <InsightSection
            title="Opportunities"
            titleAr="الفرص"
            icon={TrendingUp}
            insights={data?.opportunities || []}
            borderColor="border-s-emerald-500"
            loading={isLoading}
          />
          <InsightSection
            title="Recommendations"
            titleAr="التوصيات"
            icon={Lightbulb}
            insights={data?.recommendations || []}
            borderColor="border-s-blue-500"
            loading={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
