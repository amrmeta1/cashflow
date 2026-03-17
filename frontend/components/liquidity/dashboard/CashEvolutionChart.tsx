"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { chartGridProps, chartXAxisProps, chartYAxisProps, chartTooltipCursor, CHART_TOOLTIP_CLASS } from "@/components/shared/charts/chartStyles";

export interface CashEvolutionPoint {
  month: string;
  monthShort: string;
  year: number;
  balance: number;
  startBalance: number;
  endBalance: number;
  netChange: number;
  investments: number;
  totalEnd: number;
  inflowExpected: number;
  inflowGap: number;
  outflowExpected: number;
  outflowGap: number;
}

interface CashEvolutionChartProps {
  data: CashEvolutionPoint[];
  currency: string;
  fmt: (n: number) => string;
  isAr: boolean;
  className?: string;
}

function RichTooltip({
  active,
  payload,
  data,
  fmt,
  isAr,
}: {
  active?: boolean;
  payload?: { payload?: CashEvolutionPoint }[];
  label?: string;
  data: CashEvolutionPoint[];
  fmt: (n: number) => string;
  isAr: boolean;
}) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.payload as unknown;
  const point = raw && typeof raw === "object" && "monthShort" in raw
    ? (raw as CashEvolutionPoint)
    : null;
  if (!point) return null;
  return (
    <div className={cn(CHART_TOOLTIP_CLASS, "min-w-[260px] max-w-[300px]")}>
      <p className="text-sm font-semibold border-b border-zinc-700 pb-2 mb-2.5">
        {point.month} {point.year}
      </p>
      <div className="space-y-3 text-xs">
        <div>
          <p className="text-zinc-400 uppercase tracking-wider text-[10px] mb-1">
            {isAr ? "التدفق النقدي" : "CASHFLOW"}
          </p>
          <div className="space-y-0.5 text-zinc-200">
            <p>{isAr ? "البداية:" : "Start:"} {fmt(point.startBalance)}</p>
            <p>{isAr ? "النهاية:" : "End:"} {fmt(point.endBalance)}</p>
            <p className="font-medium text-emerald-400">
              {isAr ? "صافي التغير:" : "Net change:"} {fmt(point.netChange)}
            </p>
          </div>
        </div>
        <div>
          <p className="text-zinc-400 uppercase tracking-wider text-[10px] mb-1">
            {isAr ? "الإجمالي" : "TOTAL"}
          </p>
          <div className="space-y-0.5 text-zinc-200">
            <p>{isAr ? "الاستثمارات:" : "Investments:"} {fmt(point.investments)}</p>
            <p>{isAr ? "النهاية:" : "End:"} {fmt(point.totalEnd)}</p>
          </div>
        </div>
        <div>
          <p className="text-zinc-400 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-emerald-500" />
            {isAr ? "التدفق الوارد" : "CASH INFLOW"}
          </p>
          <div className="space-y-0.5 text-zinc-200">
            <p>{isAr ? "متوقع:" : "Expected:"} {fmt(point.inflowExpected)}</p>
            <p className="text-zinc-400">{isAr ? "فجوة للتوقعات:" : "Gap to forecast:"} {fmt(point.inflowGap)}</p>
          </div>
        </div>
        <div>
          <p className="text-zinc-400 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-red-500" />
            {isAr ? "التدفق الصادر" : "CASH OUTFLOW"}
          </p>
          <div className="space-y-0.5 text-zinc-200">
            <p>{isAr ? "متوقع:" : "Expected:"} {fmt(point.outflowExpected)}</p>
            <p className="text-zinc-400">{isAr ? "فجوة للتوقعات:" : "Gap to forecast:"} {fmt(point.outflowGap)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashEvolutionChart({
  data,
  currency,
  fmt,
  isAr,
  className,
}: CashEvolutionChartProps) {
  const chartData = useMemo(
    () =>
      (data ?? []).map((d) => ({
        ...d,
        name: d.monthShort,
        balance: d.balance,
        inflow: d.inflowExpected,
        outflow: -d.outflowExpected,
      })),
    [data]
  );

  if (!chartData.length) {
    return (
      <div
        className={cn(
          "w-full flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20",
          className
        )}
        style={{ minHeight: 340 }}
      >
        <p className="text-sm text-muted-foreground">
          {isAr ? "لا توجد بيانات لعرض الشارت" : "No data to display chart"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("w-full min-h-[340px]", className)}>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart
          data={chartData}
          margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="monthShort" {...chartXAxisProps} />
          <YAxis
            {...chartYAxisProps}
            tickFormatter={(v) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
              return String(v);
            }}
          />
          <Tooltip
            content={<RichTooltip data={data} fmt={fmt} isAr={isAr} />}
            cursor={chartTooltipCursor}
          />
          <Bar
            dataKey="inflow"
            name={isAr ? "تدفق وارد متوقع" : "Cash Inflow Expected"}
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            stackId="a"
          />
          <Bar
            dataKey="outflow"
            name={isAr ? "تدفق صادر متوقع" : "Cash Outflow Expected"}
            fill="rgb(239 68 68)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            stackId="b"
          />
          <Line
            type="monotone"
            dataKey="balance"
            name={isAr ? "الرصيد الإجمالي" : "Total"}
            stroke="hsl(217 91% 60%)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 4, fill: "var(--background)", stroke: "hsl(217 91% 60%)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "hsl(217 91% 60%)", stroke: "var(--background)", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
