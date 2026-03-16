"use client";

import { useMemo } from "react";
import { Shield, AlertTriangle, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/shared/ui/tooltip";
import type { CashflowMonthPoint } from "./MasterForecastChart";

interface LiquidityRiskBadgeProps {
  forecastData: CashflowMonthPoint[];
  isAr: boolean;
}

type RiskLevel = "low" | "medium" | "high";

interface RiskAnalysis {
  level: RiskLevel;
  riskWeek?: number;
  minBalance: number;
}

function analyzeRisk(forecastData: CashflowMonthPoint[]): RiskAnalysis {
  const forecastBalances = forecastData
    .filter((p) => p.balanceForecast != null)
    .map((p, index) => ({ balance: p.balanceForecast!, week: index + 1 }));

  if (forecastBalances.length === 0) {
    return { level: "low", minBalance: 0 };
  }

  const minEntry = forecastBalances.reduce((min, curr) =>
    curr.balance < min.balance ? curr : min
  );

  const minBalance = minEntry.balance;
  const SAFETY_THRESHOLD = 500_000;

  if (minBalance < 0) {
    return { level: "high", riskWeek: minEntry.week, minBalance };
  }

  if (minBalance < SAFETY_THRESHOLD) {
    return { level: "medium", minBalance };
  }

  return { level: "low", minBalance };
}

export function LiquidityRiskBadge({ forecastData, isAr }: LiquidityRiskBadgeProps) {
  const risk = useMemo(() => analyzeRisk(forecastData), [forecastData]);

  const config = {
    low: {
      icon: Shield,
      label: isAr ? "مخاطر منخفضة" : "Low Risk",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-600 dark:text-emerald-400",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    medium: {
      icon: AlertTriangle,
      label: isAr ? "مخاطر متوسطة" : "Medium Risk",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-600 dark:text-amber-400",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    high: {
      icon: TrendingDown,
      label: isAr ? "مخاطر عالية" : "High Risk",
      bgColor: "bg-rose-500/10",
      textColor: "text-rose-600 dark:text-rose-400",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  };

  const { icon: Icon, label, bgColor, textColor, iconColor } = config[risk.level];

  const displayText = risk.riskWeek
    ? isAr
      ? `مخاطر: الأسبوع ${risk.riskWeek}`
      : `Risk: Week ${risk.riskWeek}`
    : label;

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat(isAr ? 'ar-QA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(balance);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-help",
              bgColor,
              textColor
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", iconColor)} />
            <span>{displayText}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="text-xs font-medium">
              {isAr ? "الحد الأدنى للرصيد" : "Minimum Balance"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBalance(risk.minBalance)}
            </p>
            {risk.riskWeek && (
              <p className="text-xs text-muted-foreground">
                {isAr ? `الأسبوع ${risk.riskWeek}` : `Week ${risk.riskWeek}`}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
