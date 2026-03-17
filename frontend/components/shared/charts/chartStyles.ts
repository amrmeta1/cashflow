/**
 * Shared chart styling (aligned with Cash Evolution chart design).
 * Use these in all Recharts: CartesianGrid, XAxis, YAxis, Tooltip cursor, and tooltip wrappers.
 */

export const chartGridProps = {
  stroke: "currentColor" as const,
  opacity: 0.06,
  vertical: false,
};

export const chartXAxisProps = {
  tick: { fontSize: 10, fill: "hsl(240 3.8% 46.1%)" as const },
  axisLine: false,
  tickLine: false,
};

export const chartYAxisProps = {
  tick: { fontSize: 10, fill: "hsl(240 3.8% 46.1%)" as const },
  axisLine: false,
  tickLine: false,
  width: 52,
};

export const chartTooltipCursor = {
  fill: "hsl(0 0% 50% / 0.08)",
  radius: 6,
};

/** Wrapper class for custom tooltips: dark zinc glass (same as Cash Evolution). */
export const CHART_TOOLTIP_CLASS =
  "rounded-xl border border-white/10 bg-zinc-900 text-zinc-100 shadow-xl backdrop-blur-sm min-w-[200px] max-w-[320px] p-3.5";
