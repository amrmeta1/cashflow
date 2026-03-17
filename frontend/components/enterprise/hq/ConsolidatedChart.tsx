"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ── Mock 6-month stacked data ─────────────────────────────────────────────────
// Contracting is negative so the bar dips below the zero line.

const MONTHS_EN = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
const MONTHS_AR = ["سبت", "أكت", "نوف", "ديس", "يناير", "فبراير"];

const RAW = [
  { realEstate: 4_800_000, contracting: -980_000,  retail: 3_100_000, logistics: 950_000  },
  { realEstate: 5_000_000, contracting: -1_050_000, retail: 3_200_000, logistics: 1_000_000 },
  { realEstate: 5_100_000, contracting: -1_100_000, retail: 3_250_000, logistics: 1_050_000 },
  { realEstate: 5_050_000, contracting: -1_180_000, retail: 3_300_000, logistics: 1_080_000 },
  { realEstate: 5_150_000, contracting: -1_220_000, retail: 3_350_000, logistics: 1_090_000 },
  { realEstate: 5_200_000, contracting: -1_250_000, retail: 3_400_000, logistics: 1_100_000 },
];

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
  isAr: boolean;
}

const ENTITY_LABELS: Record<string, { en: string; ar: string }> = {
  realEstate:  { en: "Real Estate",  ar: "العقارات" },
  contracting: { en: "Contracting",  ar: "المقاولات" },
  retail:      { en: "Retail",       ar: "التجزئة" },
  logistics:   { en: "Logistics",    ar: "اللوجستيات" },
};

function fmtSAR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}SAR ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}SAR ${(abs / 1_000).toFixed(0)}k`;
  return `${sign}SAR ${abs.toLocaleString("en-US")}`;
}

function ConsolidatedTooltip({ active, payload, label, isAr }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);

  return (
    <div className="rounded-md border bg-popover shadow-lg p-3 text-xs min-w-[200px] space-y-1.5">
      <p className="font-semibold text-foreground border-b pb-1.5 mb-1">{label}</p>
      {payload.map((p) => {
        const key = p.name as keyof typeof ENTITY_LABELS;
        const lbl = ENTITY_LABELS[key]?.[isAr ? "ar" : "en"] ?? p.name;
        return (
          <div key={p.name} className="flex justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-sm shrink-0" style={{ background: p.fill }} />
              {lbl}
            </span>
            <span
              className={
                p.value < 0
                  ? "font-semibold tabular-nums text-destructive"
                  : "font-medium tabular-nums text-foreground"
              }
            >
              {fmtSAR(p.value)}
            </span>
          </div>
        );
      })}
      <div className="border-t pt-1.5 flex justify-between gap-4">
        <span className="text-muted-foreground font-medium">{isAr ? "الإجمالي" : "Net Total"}</span>
        <span className={`font-bold tabular-nums ${total < 0 ? "text-destructive" : "text-foreground"}`}>
          {fmtSAR(total)}
        </span>
      </div>
    </div>
  );
}

// ── Chart ─────────────────────────────────────────────────────────────────────

interface ConsolidatedChartProps {
  isAr: boolean;
}

const COLORS = {
  realEstate:  "hsl(142 71% 45%)",   // emerald
  contracting: "hsl(0 72% 51%)",     // red/destructive
  retail:      "hsl(217 91% 60%)",   // blue
  logistics:   "hsl(240 5% 55%)",    // muted slate
};

export function ConsolidatedChart({ isAr }: ConsolidatedChartProps) {
  const months = isAr ? MONTHS_AR : MONTHS_EN;

  const data = RAW.map((row, i) => ({
    month: months[i],
    ...row,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        stackOffset="sign"
      >
        <defs>
          <linearGradient id="gradRealEstate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={COLORS.realEstate}  stopOpacity={0.9} />
            <stop offset="100%" stopColor={COLORS.realEstate}  stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradContracting" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={COLORS.contracting} stopOpacity={0.9} />
            <stop offset="100%" stopColor={COLORS.contracting} stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradRetail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={COLORS.retail}      stopOpacity={0.9} />
            <stop offset="100%" stopColor={COLORS.retail}      stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradLogistics" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={COLORS.logistics}   stopOpacity={0.9} />
            <stop offset="100%" stopColor={COLORS.logistics}   stopOpacity={0.6} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(240 5.9% 90%)"
          vertical={false}
          className="dark:[stroke:hsl(240_3.7%_15.9%)]"
        />

        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "hsl(240 3.8% 46.1%)" }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          tick={{ fontSize: 10, fill: "hsl(240 3.8% 46.1%)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
          width={48}
          orientation={isAr ? "right" : "left"}
        />

        <Tooltip
          content={<ConsolidatedTooltip isAr={isAr} />}
          cursor={{ fill: "hsl(240 5.9% 90% / 0.4)" }}
        />

        {/* Zero reference line — prominent so the deficit dip is obvious */}
        <ReferenceLine
          y={0}
          stroke="hsl(240 3.8% 46.1%)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* Contracting MUST be declared first — stackOffset="sign" renders
            negative-value bars downward only when they appear before positive bars */}
        <Bar dataKey="contracting" stackId="a" fill={COLORS.contracting} fillOpacity={0.85} radius={[0, 0, 4, 4]} name="contracting" />
        <Bar dataKey="realEstate"  stackId="a" fill="url(#gradRealEstate)"  radius={[0, 0, 0, 0]} name="realEstate" />
        <Bar dataKey="retail"      stackId="a" fill="url(#gradRetail)"      radius={[0, 0, 0, 0]} name="retail" />
        <Bar dataKey="logistics"   stackId="a" fill="url(#gradLogistics)"   radius={[4, 4, 0, 0]} name="logistics" />
      </BarChart>
    </ResponsiveContainer>
  );
}
