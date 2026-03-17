"use client";

import { PieChart, Pie, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/shared/ui/chart";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CurrencySlice {
  currency: string;
  amount: number;
  fill: string;
}

interface ExposureChartProps {
  data: CurrencySlice[];
  config: ChartConfig;
  isAr?: boolean;
  fmt: (amountInSAR: number) => string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExposureChart({ data, config, isAr = false, fmt }: ExposureChartProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Donut chart */}
      <ChartContainer
        config={config}
        className="mx-auto aspect-square max-h-[220px] w-full"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={data}
            dataKey="amount"
            nameKey="currency"
            innerRadius={60}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((slice) => (
              <Cell key={slice.currency} fill={slice.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Dense custom legend */}
      <ul className="space-y-1.5 px-1">
        {data.map((slice) => {
          const cfg = config[slice.currency.toLowerCase()];
          return (
            <li
              key={slice.currency}
              className="flex items-center gap-2 text-sm"
            >
              {/* Color dot */}
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: slice.fill }}
              />
              {/* Currency label */}
              <span className="font-medium text-foreground">
                {cfg?.label ?? slice.currency}
              </span>
              {/* Amount — pushed to end */}
              <span className="ms-auto tabular-nums font-mono text-xs text-muted-foreground">
                {fmt(slice.amount)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
