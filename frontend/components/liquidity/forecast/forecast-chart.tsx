"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  chartGridProps,
  chartXAxisProps,
  chartYAxisProps,
  chartTooltipCursor,
  CHART_TOOLTIP_CLASS,
} from "@/components/shared/charts/chartStyles";
import type { Scenario } from "@/contexts/ScenarioContext";

const SCENARIO_COLORS = [
  "hsl(243 75% 59%)",  // indigo
  "hsl(258 90% 66%)",  // violet
  "hsl(38 92% 50%)",   // amber
];

const SCENARIO_LETTERS = ["A", "B", "C"];

// ── Custom Tooltip ──────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  name: string;
  color?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  fmt: (n: number) => string;
  isAr: boolean;
  scenarioNames: Record<string, string>;
}

function ForecastTooltip({
  active,
  payload,
  label,
  fmt,
  isAr,
  scenarioNames,
}: TooltipProps) {
  if (!active || !payload?.length) return null;

  const base = payload.find((p) => p.dataKey === "baseBalance")?.value ?? 0;

  return (
    <div className={cn(CHART_TOOLTIP_CLASS, "min-w-[210px] space-y-2 text-xs")}>
      <p className="font-semibold text-zinc-100 border-b border-zinc-700 pb-2 mb-2">
        {label}
      </p>

      <div className="flex justify-between gap-4">
        <span className="text-zinc-400 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 rounded-full bg-primary" />
          {isAr ? "الأساس" : "Base"}
        </span>
        <span className="font-medium tabular-nums text-zinc-200">{fmt(base)}</span>
      </div>

      {payload
        .filter((p) => p.dataKey.startsWith("scenario_"))
        .map((p) => {
          const val = p.value ?? 0;
          const delta = val - base;
          const name = scenarioNames[p.dataKey] ?? p.dataKey;
          return (
            <div key={p.dataKey} className="flex justify-between gap-4">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <span
                  className="inline-block h-1.5 w-4 rounded-full"
                  style={{ background: p.color ?? "hsl(243 75% 59%)" }}
                />
                {name}
              </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  val < 0 ? "text-rose-400" : "text-zinc-200"
                )}
              >
                {fmt(val)}
              </span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  delta >= 0 ? "text-emerald-400" : "text-rose-400"
                )}
              >
                ({delta >= 0 ? "+" : ""}{fmt(delta)})
              </span>
            </div>
          );
        })}
    </div>
  );
}

// ── Chart ───────────────────────────────────────────────────────────────────

export interface ForecastChartProps {
  base: number[];
  scenarios: Scenario[];
  labels: string[];
  fmt: (n: number) => string;
  fmtAxis?: (n: number) => string;
  isAr: boolean;
  currencyCode?: string;
  /** When provided, only scenario lines whose id is in this set are rendered. Base is always shown. */
  visibleScenarioIds?: Set<string> | null;
}

export function ForecastChart({
  base,
  scenarios,
  labels,
  fmt,
  fmtAxis,
  isAr,
  currencyCode = "QAR",
  visibleScenarioIds = null,
}: ForecastChartProps) {
  const chartData = useMemo(() => {
    return labels.map((label, i) => {
      const point: Record<string, string | number> = {
        label,
        baseBalance: base[i] ?? 0,
      };
      scenarios.forEach((s) => {
        point[`scenario_${s.id}`] = s.newForecast[i] ?? 0;
      });
      return point;
    });
  }, [labels, base, scenarios]);

  const scenarioNames = useMemo(() => {
    const names: Record<string, string> = {};
    scenarios.forEach((s, idx) => {
      const letter = SCENARIO_LETTERS[idx] ?? String(idx + 1);
      names[`scenario_${s.id}`] = isAr ? `السيناريو ${letter}` : `Scenario ${letter}`;
    });
    return names;
  }, [scenarios, isAr]);

  const scenariosToShow =
    visibleScenarioIds == null
      ? scenarios
      : scenarios.filter((s) => visibleScenarioIds.has(s.id));

  const tickDays = new Set(
    chartData.filter((_, i) => i % 3 === 0).map((d) => d.label)
  );
  const axisFmt = fmtAxis ?? ((v: number) => `${(v / 1000).toFixed(0)}k`);

  return (
    <div className="w-full space-y-3">
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid {...chartGridProps} />

          <XAxis
            dataKey="label"
            {...chartXAxisProps}
            interval="preserveStartEnd"
            tickFormatter={(v) => (tickDays.has(v) ? v : "")}
          />

          <YAxis
            {...chartYAxisProps}
            tickFormatter={axisFmt}
            width={42}
            orientation={isAr ? "right" : "left"}
          />

          <ReTooltip
            content={
              <ForecastTooltip
                fmt={fmt}
                isAr={isAr}
                scenarioNames={scenarioNames}
              />
            }
            cursor={chartTooltipCursor}
          />

          <ReferenceLine
            y={0}
            stroke="hsl(0 72% 51% / 0.6)"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: isAr ? "صفر" : "Zero",
              position: "insideTopRight",
              fontSize: 9,
              fill: "hsl(0 72% 51%)",
            }}
          />

          {/* Base: solid primary line */}
          <Line
            dataKey="baseBalance"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--primary))" }}
            name={isAr ? "الأساس" : "Base"}
            legendType="line"
          />

          {/* Each scenario: dashed line, distinct color */}
          {scenariosToShow.map((s, idx) => {
            const dataKey = `scenario_${s.id}`;
            const color = SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
            const name = scenarioNames[dataKey] ?? dataKey;
            return (
              <Line
                key={s.id}
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                name={name}
                legendType="line"
              />
            );
          })}

          <Legend wrapperStyle={{ fontSize: 11 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
