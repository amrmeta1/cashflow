"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { cn } from "@/lib/utils";

interface ScenarioVisualDiffProps {
  baseScenario: {
    name: string;
    data: Array<{ month: string; balance: number }>;
  };
  compareScenario: {
    name: string;
    data: Array<{ month: string; balance: number }>;
  };
  isAr: boolean;
  formatAmount: (amount: number) => string;
}

interface DiffMetric {
  label: string;
  baseLine: number;
  compareLine: number;
  difference: number;
  percentChange: number;
  trend: "up" | "down" | "neutral";
}

export function ScenarioVisualDiff({
  baseScenario,
  compareScenario,
  isAr,
  formatAmount,
}: ScenarioVisualDiffProps) {
  const metrics = useMemo(() => {
    const diffMetrics: DiffMetric[] = [];

    // Calculate average balance for both scenarios
    const baseAvg =
      baseScenario.data.reduce((sum, d) => sum + d.balance, 0) / baseScenario.data.length;
    const compareAvg =
      compareScenario.data.reduce((sum, d) => sum + d.balance, 0) / compareScenario.data.length;
    const avgDiff = compareAvg - baseAvg;
    const avgPercent = ((avgDiff / baseAvg) * 100);

    diffMetrics.push({
      label: isAr ? "متوسط الرصيد" : "Average Balance",
      baseLine: baseAvg,
      compareLine: compareAvg,
      difference: avgDiff,
      percentChange: avgPercent,
      trend: avgDiff > 0 ? "up" : avgDiff < 0 ? "down" : "neutral",
    });

    // Calculate final balance
    const baseFinal = baseScenario.data[baseScenario.data.length - 1]?.balance || 0;
    const compareFinal = compareScenario.data[compareScenario.data.length - 1]?.balance || 0;
    const finalDiff = compareFinal - baseFinal;
    const finalPercent = ((finalDiff / baseFinal) * 100);

    diffMetrics.push({
      label: isAr ? "الرصيد النهائي" : "Final Balance",
      baseLine: baseFinal,
      compareLine: compareFinal,
      difference: finalDiff,
      percentChange: finalPercent,
      trend: finalDiff > 0 ? "up" : finalDiff < 0 ? "down" : "neutral",
    });

    // Calculate peak balance
    const basePeak = Math.max(...baseScenario.data.map((d) => d.balance));
    const comparePeak = Math.max(...compareScenario.data.map((d) => d.balance));
    const peakDiff = comparePeak - basePeak;
    const peakPercent = ((peakDiff / basePeak) * 100);

    diffMetrics.push({
      label: isAr ? "أعلى رصيد" : "Peak Balance",
      baseLine: basePeak,
      compareLine: comparePeak,
      difference: peakDiff,
      percentChange: peakPercent,
      trend: peakDiff > 0 ? "up" : peakDiff < 0 ? "down" : "neutral",
    });

    // Calculate lowest balance
    const baseLowest = Math.min(...baseScenario.data.map((d) => d.balance));
    const compareLowest = Math.min(...compareScenario.data.map((d) => d.balance));
    const lowestDiff = compareLowest - baseLowest;
    const lowestPercent = ((lowestDiff / baseLowest) * 100);

    diffMetrics.push({
      label: isAr ? "أدنى رصيد" : "Lowest Balance",
      baseLine: baseLowest,
      compareLine: compareLowest,
      difference: lowestDiff,
      percentChange: lowestPercent,
      trend: lowestDiff > 0 ? "up" : lowestDiff < 0 ? "down" : "neutral",
    });

    return diffMetrics;
  }, [baseScenario, compareScenario, isAr]);

  const getTrendIcon = (trend: DiffMetric["trend"]) => {
    switch (trend) {
      case "up":
        return ArrowUpRight;
      case "down":
        return ArrowDownRight;
      default:
        return Minus;
    }
  };

  const getTrendColor = (trend: DiffMetric["trend"]) => {
    switch (trend) {
      case "up":
        return "text-emerald-600 dark:text-emerald-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getTrendBg = (trend: DiffMetric["trend"]) => {
    switch (trend) {
      case "up":
        return "bg-emerald-500/10";
      case "down":
        return "bg-red-500/10";
      default:
        return "bg-muted/50";
    }
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {isAr ? "مقارنة السيناريوهات" : "Scenario Comparison"}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
              {baseScenario.name}
            </span>
            <span>vs</span>
            <span className="px-2 py-1 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium">
              {compareScenario.name}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((metric) => {
            const TrendIcon = getTrendIcon(metric.trend);
            return (
              <div
                key={metric.label}
                className={cn(
                  "rounded-lg border border-border/50 p-3 transition-all hover:shadow-sm",
                  getTrendBg(metric.trend)
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <div className={cn("flex items-center gap-1", getTrendColor(metric.trend))}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">
                      {Math.abs(metric.percentChange).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{baseScenario.name}:</span>
                    <span className="font-medium tabular-nums">
                      {formatAmount(metric.baseLine)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{compareScenario.name}:</span>
                    <span className="font-medium tabular-nums">
                      {formatAmount(metric.compareLine)}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {isAr ? "الفرق" : "Difference"}:
                      </span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          getTrendColor(metric.trend)
                        )}
                      >
                        {metric.difference > 0 ? "+" : ""}
                        {formatAmount(metric.difference)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-start gap-2">
            <div className="mt-0.5">
              {metrics[0].trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : metrics[0].trend === "down" ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold mb-1">
                {isAr ? "التأثير الإجمالي" : "Overall Impact"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isAr
                  ? `السيناريو "${compareScenario.name}" يُظهر ${
                      metrics[0].trend === "up"
                        ? "تحسن"
                        : metrics[0].trend === "down"
                        ? "انخفاض"
                        : "استقرار"
                    } بنسبة ${Math.abs(metrics[0].percentChange).toFixed(
                      1
                    )}% في متوسط الرصيد مقارنة بـ "${baseScenario.name}".`
                  : `Scenario "${compareScenario.name}" shows a ${Math.abs(
                      metrics[0].percentChange
                    ).toFixed(1)}% ${
                      metrics[0].trend === "up"
                        ? "improvement"
                        : metrics[0].trend === "down"
                        ? "decrease"
                        : "stability"
                    } in average balance compared to "${baseScenario.name}".`}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
