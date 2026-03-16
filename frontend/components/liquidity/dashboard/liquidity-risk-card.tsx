"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/shared/ui/card";
import { AlertTriangle, Shield, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCashForecast } from "@/lib/api/cash-forecast-api";
import type { ForecastWeek } from "@/lib/api/cash-forecast-api";
import { Skeleton } from "@/components/shared/ui/skeleton";

interface LiquidityRiskCardProps {
  tenantId?: string;
  currency: string;
  isAr: boolean;
}

type RiskLevel = "low" | "medium" | "high";

interface RiskData {
  level: RiskLevel;
  riskWeek?: number;
  confidence: number;
}

function calculateRisk(forecast: ForecastWeek[]): RiskData {
  if (!forecast || forecast.length === 0) {
    return { level: "low", confidence: 0 };
  }

  const firstNegativeWeek = forecast.findIndex((week) => week.ending_balance < 0);

  if (firstNegativeWeek === -1) {
    return { level: "low", confidence: 87 };
  }

  if (firstNegativeWeek < 6) {
    return { level: "high", riskWeek: firstNegativeWeek + 1, confidence: 92 };
  }

  if (firstNegativeWeek < 13) {
    return { level: "medium", riskWeek: firstNegativeWeek + 1, confidence: 85 };
  }

  return { level: "low", confidence: 87 };
}

export function LiquidityRiskCard({ tenantId, currency, isAr }: LiquidityRiskCardProps) {
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState<RiskData>({ level: "low", confidence: 87 });

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchRisk = async () => {
      try {
        const data = await getCashForecast(tenantId);
        const risk = calculateRisk(data.forecast);
        setRiskData(risk);
      } catch (error) {
        console.warn("Failed to fetch liquidity risk:", error);
        setRiskData({ level: "low", confidence: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchRisk();
  }, [tenantId]);

  const riskConfig = {
    low: {
      label: isAr ? "مخاطر منخفضة" : "LOW RISK",
      dotColor: "bg-emerald-500",
      gradient: "bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20",
      icon: Shield,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      changeColor: "text-emerald-500 bg-emerald-500/10",
    },
    medium: {
      label: isAr ? "مخاطر متوسطة" : "MEDIUM RISK",
      dotColor: "bg-amber-500",
      gradient: "bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20",
      icon: AlertTriangle,
      iconColor: "text-amber-600 dark:text-amber-400",
      changeColor: "text-amber-500 bg-amber-500/10",
    },
    high: {
      label: isAr ? "مخاطر عالية" : "HIGH RISK",
      dotColor: "bg-rose-500",
      gradient: "bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-950/20",
      icon: TrendingDown,
      iconColor: "text-rose-600 dark:text-rose-400",
      changeColor: "text-rose-500 bg-rose-500/10",
    },
  };

  const config = riskConfig[riskData.level];
  const RiskIcon = config.icon;

  if (loading) {
    return (
      <Card className="shadow-sm border-border/50 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-3 w-28 mb-2" />
          <Skeleton className="h-6 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-sm border-border/50 overflow-hidden", config.gradient)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("w-2 h-2 rounded-full shrink-0", config.dotColor)} />
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-none">
            {isAr ? "مخاطر السيولة" : "Liquidity Risk"}
          </p>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <RiskIcon className={cn("h-5 w-5", config.iconColor)} />
          <p suppressHydrationWarning className="text-xl font-bold tracking-tight leading-none">
            {config.label}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {riskData.riskWeek
            ? isAr
              ? `المخاطر التالية: الأسبوع ${riskData.riskWeek}`
              : `Next risk: Week ${riskData.riskWeek}`
            : isAr
            ? "لا توجد مخاطر مكتشفة"
            : "No risks detected"}
        </p>
        {riskData.confidence > 0 && (
          <div className={cn("px-2 py-0.5 rounded-md text-xs font-medium w-fit mt-2", config.changeColor)}>
            {isAr ? `الثقة: ${riskData.confidence}%` : `Confidence: ${riskData.confidence}%`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
