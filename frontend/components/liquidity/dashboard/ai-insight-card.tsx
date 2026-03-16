"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/shared/ui/card";
import { Sparkles, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCashFlowPatterns } from "@/lib/api/cashflow-dna-api";
import type { CashFlowPattern } from "@/lib/api/cashflow-dna-api";
import { Skeleton } from "@/components/shared/ui/skeleton";

interface AIInsightCardProps {
  tenantId?: string;
  isAr: boolean;
}

interface Insight {
  text: string;
  icon: typeof TrendingUp;
  iconColor: string;
}

function generateInsights(patterns: CashFlowPattern[], isAr: boolean): Insight[] {
  const insights: Insight[] = [];

  const burnRatePattern = patterns.find((p) => p.pattern_type === "burn_rate");
  if (burnRatePattern?.metadata?.components) {
    const { payroll, subscriptions, vendors } = burnRatePattern.metadata.components;
    const total = Math.abs(burnRatePattern.avg_amount);
    
    if (payroll && total > 0) {
      const percentage = Math.round((Math.abs(payroll) / total) * 100);
      insights.push({
        text: isAr
          ? `الرواتب تمثل ${percentage}٪ من الحرق الشهري`
          : `Payroll represents ${percentage}% of monthly burn`,
        icon: TrendingUp,
        iconColor: "text-indigo-600 dark:text-indigo-400",
      });
    }

    if (subscriptions && Math.abs(subscriptions) > 1000) {
      insights.push({
        text: isAr
          ? `${Math.round(Math.abs(subscriptions) / 1000)}k ريال في الاشتراكات الشهرية`
          : `${Math.round(Math.abs(subscriptions) / 1000)}k in monthly subscriptions`,
        icon: DollarSign,
        iconColor: "text-emerald-600 dark:text-emerald-400",
      });
    }
  }

  const highConfidencePatterns = patterns.filter(
    (p) => p.confidence >= 90 && p.pattern_type === "subscription"
  );
  if (highConfidencePatterns.length > 0) {
    insights.push({
      text: isAr
        ? `${highConfidencePatterns.length} اشتراك مكتشف بثقة عالية`
        : `${highConfidencePatterns.length} subscription${highConfidencePatterns.length > 1 ? "s" : ""} detected with high confidence`,
      icon: Sparkles,
      iconColor: "text-amber-600 dark:text-amber-400",
    });
  }

  const payrollPattern = patterns.find((p) => p.pattern_type === "payroll");
  if (payrollPattern && payrollPattern.next_expected) {
    try {
      const nextDate = new Date(payrollPattern.next_expected);
      const today = new Date();
      const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil > 0 && daysUntil <= 7) {
        insights.push({
          text: isAr
            ? `الرواتب القادمة في ${daysUntil} أيام`
            : `Next payroll in ${daysUntil} day${daysUntil > 1 ? "s" : ""}`,
          icon: Calendar,
          iconColor: "text-rose-600 dark:text-rose-400",
        });
      }
    } catch {
      // Ignore date parsing errors
    }
  }

  if (insights.length === 0) {
    insights.push({
      text: isAr
        ? "تحليل الأنماط المالية جاري..."
        : "Analyzing financial patterns...",
      icon: Sparkles,
      iconColor: "text-muted-foreground",
    });
  }

  return insights.slice(0, 2);
}

export function AIInsightCard({ tenantId, isAr }: AIInsightCardProps) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      setInsights([
        {
          text: isAr ? "تحليل الأنماط المالية جاري..." : "Analyzing financial patterns...",
          icon: Sparkles,
          iconColor: "text-muted-foreground",
        },
      ]);
      return;
    }

    const fetchInsights = async () => {
      try {
        const data = await getCashFlowPatterns(tenantId, 60);
        const generated = generateInsights(data.patterns || [], isAr);
        setInsights(generated);
      } catch (error) {
        console.warn("Failed to fetch insights:", error);
        setInsights([
          {
            text: isAr ? "لا توجد رؤى متاحة" : "No insights available",
            icon: Sparkles,
            iconColor: "text-muted-foreground",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [tenantId, isAr]);

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {isAr ? "رؤية الذكاء الاصطناعي" : "AI Insight"}
        </h3>
        <Card className="border-border/40 shadow-none bg-muted/20">
          <CardContent className="p-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {isAr ? "رؤية الذكاء الاصطناعي" : "AI Insight"}
      </h3>
      <Card className="border-border/40 shadow-none bg-gradient-to-br from-indigo-50/30 via-transparent to-emerald-50/20 dark:from-indigo-950/10 dark:via-transparent dark:to-emerald-950/5">
        <CardContent className="p-3 space-y-2.5">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div key={index} className="flex items-start gap-2">
                <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", insight.iconColor)} />
                <p className="text-xs text-foreground leading-relaxed">{insight.text}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
