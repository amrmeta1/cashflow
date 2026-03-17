"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from "recharts";
import { useI18n } from "@/lib/i18n/context";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ForecastDataPoint {
  week: string;
  actual: number | null;
  forecast: number | null;
  isAnomaly?: boolean;
  aiNote?: string | null;
}

export interface CashflowMonthPoint {
  month: string;
  isCurrent?: boolean;
  inflow?: number;
  outflow?: number;
  inflowFuture?: number;
  outflowFuture?: number;
  balance?: number;
  balanceForecast?: number;
}

interface MasterForecastChartProps {
  data: CashflowMonthPoint[];
  fmt: (n: number) => string;
  fmtAxis: (n: number) => string;
  currCode: string;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, fmt, isAr }: { active?: boolean; payload?: any[]; label?: string; fmt: (n: number) => string; isAr: boolean }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) => p.value != null && p.value !== 0);
  return (
    <div dir={isAr ? "rtl" : "ltr"} className="bg-popover text-popover-foreground border border-border shadow-sm rounded-lg p-3 min-w-[210px]">
      <p className="font-semibold text-sm mb-2 pb-1.5 border-b border-border">{label}</p>
      <div className="space-y-1.5">
        {rows.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-xs text-muted-foreground">{p.name}</span>
            </div>
            <span dir="ltr" className="font-mono text-xs font-medium tabular-nums" style={{ color: p.color }} suppressHydrationWarning>
              {fmt(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MasterForecastChart({ data, fmt, fmtAxis, currCode }: MasterForecastChartProps) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const currentMonth = data.find((d) => d.isCurrent)?.month;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data} margin={{ top: 8, right: isAr ? 0 : 16, left: isAr ? 16 : 0, bottom: 0 }} barGap={2}>
        <defs>
          {/* Diagonal stripe — green (future inflow) */}
          <pattern id="stripeGreen" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#34d39922" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#34d399" strokeWidth="2.5" />
          </pattern>
          {/* Diagonal stripe — rose (future outflow) */}
          <pattern id="stripeRed" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#fb718522" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#fb7185" strokeWidth="2.5" />
          </pattern>
        </defs>

        {/* Current month highlight — derived from data instead of hardcoded */}
        {currentMonth && (
          <ReferenceArea x1={currentMonth} x2={currentMonth} fill="#3b82f6" fillOpacity={0.07} />
        )}

        <CartesianGrid stroke="currentColor" opacity={0.05} vertical={false} />

        <XAxis
          dataKey="month"
          reversed={isAr}
          tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          orientation={isAr ? "right" : "left"}
          width={120}
          tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmtAxis}
        />

        <Tooltip content={<ChartTooltip fmt={fmt} isAr={isAr} />} key={currCode} />

        <Legend
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
        />

        {/* Past bars — solid */}
        <Bar dataKey="inflow"  name={isAr ? "إيرادات فعلية" : "Actual Inflow"}  fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="outflow" name={isAr ? "مصروفات فعلية" : "Actual Outflow"} fill="#fb7185" radius={[3, 3, 0, 0]} maxBarSize={32} />

        {/* Future bars — striped */}
        <Bar dataKey="inflowFuture"  name={isAr ? "إيرادات متوقعة" : "Forecasted Inflow"}  fill="url(#stripeGreen)" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="outflowFuture" name={isAr ? "مصروفات متوقعة" : "Forecasted Outflow"} fill="url(#stripeRed)"   radius={[3, 3, 0, 0]} maxBarSize={32} />

        {/* Past balance — solid blue */}
        <Line
          type="monotone"
          dataKey="balance"
          name={isAr ? "الرصيد الفعلي" : "Actual Balance"}
          stroke="#818cf8"
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: "var(--background)", stroke: "#818cf8", strokeWidth: 2 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          connectNulls={false}
        />

        {/* Future balance — dashed indigo */}
        <Line
          type="monotone"
          dataKey="balanceForecast"
          name={isAr ? "الرصيد المتوقع" : "Forecasted Balance"}
          stroke="#818cf8"
          strokeWidth={2.5}
          strokeDasharray="5 5"
          dot={{ r: 3.5, fill: "var(--background)", stroke: "#818cf8", strokeWidth: 2 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
