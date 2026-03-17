"use client";

import { useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { TimeRangeButtons, type TimeRangeKey } from "@/components/shared/charts/TimeRangeButtons";
import { RechartsTooltipGlass } from "@/components/shared/charts/ChartTooltipGlass";
import { ChartExportButton } from "@/components/shared/charts/ChartExportButton";
import { chartGridProps, chartXAxisProps, chartYAxisProps, chartTooltipCursor } from "@/components/shared/charts/chartStyles";

type MonthKey = "oct" | "nov" | "dec" | "jan" | "feb" | "mar" | "apr" | "may" | "jun" | "jul" | "aug" | "sep";

const RAW_6: { monthKey: MonthKey; inflow: number; outflow: number; balance: number }[] = [
  { monthKey: "oct", inflow: 85000, outflow: 62000, balance: 110000 },
  { monthKey: "nov", inflow: 92000, outflow: 71000, balance: 131000 },
  { monthKey: "dec", inflow: 78000, outflow: 85000, balance: 124000 },
  { monthKey: "jan", inflow: 105000, outflow: 68000, balance: 161000 },
  { monthKey: "feb", inflow: 98000, outflow: 74000, balance: 185000 },
  { monthKey: "mar", inflow: 112000, outflow: 79000, balance: 218000 },
];

const EXTRA_6: { monthKey: MonthKey; inflow: number; outflow: number; balance: number }[] = [
  { monthKey: "apr", inflow: 95000, outflow: 72000, balance: 241000 },
  { monthKey: "may", inflow: 108000, outflow: 81000, balance: 268000 },
  { monthKey: "jun", inflow: 102000, outflow: 76000, balance: 294000 },
  { monthKey: "jul", inflow: 115000, outflow: 83000, balance: 326000 },
  { monthKey: "aug", inflow: 99000, outflow: 78000, balance: 347000 },
  { monthKey: "sep", inflow: 118000, outflow: 85000, balance: 380000 },
];

const MONTH_LABELS_EN: Record<MonthKey, string> = {
  oct: "Oct", nov: "Nov", dec: "Dec", jan: "Jan", feb: "Feb", mar: "Mar",
  apr: "Apr", may: "May", jun: "Jun", jul: "Jul", aug: "Aug", sep: "Sep",
};
const MONTH_LABELS_AR: Record<MonthKey, string> = {
  oct: "أكتوبر", nov: "نوفمبر", dec: "ديسمبر", jan: "يناير", feb: "فبراير", mar: "مارس",
  apr: "أبريل", may: "مايو", jun: "يونيو", jul: "يوليو", aug: "أغسطس", sep: "سبتمبر",
};

/** Map monthKey to first day of month (Oct=2024-10, ... Sep=2025-09) */
const MONTH_TO_DATE: Record<MonthKey, Date> = {
  oct: new Date(2024, 9, 1), nov: new Date(2024, 10, 1), dec: new Date(2024, 11, 1),
  jan: new Date(2025, 0, 1), feb: new Date(2025, 1, 1), mar: new Date(2025, 2, 1),
  apr: new Date(2025, 3, 1), may: new Date(2025, 4, 1), jun: new Date(2025, 5, 1),
  jul: new Date(2025, 6, 1), aug: new Date(2025, 7, 1), sep: new Date(2025, 8, 1),
};

function getDataForRange(range: TimeRangeKey, isAr: boolean): { month: string; monthKey: MonthKey; year: number; inflow: number; outflow: number; balance: number }[] {
  const full12 = [...RAW_6, ...EXTRA_6];
  const labels = isAr ? MONTH_LABELS_AR : MONTH_LABELS_EN;
  let slice: typeof full12;
  if (range === "3m") slice = RAW_6.slice(-3);
  else if (range === "6m") slice = RAW_6;
  else if (range === "12m") slice = full12;
  else slice = full12;
  return slice.map((row) => ({
    month: labels[row.monthKey],
    monthKey: row.monthKey,
    year: MONTH_TO_DATE[row.monthKey].getFullYear(),
    inflow: row.inflow,
    outflow: row.outflow,
    balance: row.balance,
  }));
}

function getDataForDateRange(
  dateRange: { from: Date; to: Date },
  isAr: boolean
): { month: string; inflow: number; outflow: number; balance: number }[] {
  const full12 = [...RAW_6, ...EXTRA_6];
  const labels = isAr ? MONTH_LABELS_AR : MONTH_LABELS_EN;
  const from = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 1);
  const to = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), 1);
  return full12.filter((row) => {
    const d = MONTH_TO_DATE[row.monthKey];
    return d >= from && d <= to;
  }).map((row) => ({
    month: labels[row.monthKey],
    monthKey: row.monthKey,
    year: MONTH_TO_DATE[row.monthKey].getFullYear(),
    inflow: row.inflow,
    outflow: row.outflow,
    balance: row.balance,
  }));
}

function TooltipContent({ active, payload, label, fmt, data, isAr }: any) {
  if (!active || !payload?.length || !label) return null;
  const idx = data?.findIndex((d: any) => d.month === label) ?? -1;
  const row = idx >= 0 ? data?.[idx] : null;
  const prevBalance = idx > 0 && data?.[idx - 1] ? data[idx - 1].balance : undefined;
  const currBalance = row?.balance;
  const pctChange =
    prevBalance != null && prevBalance !== 0 && currBalance != null
      ? ((currBalance - prevBalance) / prevBalance) * 100
      : undefined;
  const labelFormatted = row && isAr ? `${row.month} ${row.year}` : row ? (isAr ? `${row.month} ${row.year}` : label) : label;
  const inflow = row?.inflow ?? 0;
  const outflow = row?.outflow ?? 0;
  const subLine = isAr
    ? `الوارد: ${fmt(inflow)} | الصادر: ${fmt(outflow)}`
    : `Inflow: ${fmt(inflow)} | Outflow: ${fmt(outflow)}`;
  return (
    <RechartsTooltipGlass
      active={active}
      payload={payload}
      label={labelFormatted}
      fmt={fmt}
      pctChange={pctChange}
      mainValue={currBalance}
      subLine={subLine}
      isPremium
    />
  );
}

export interface DashboardDateRange {
  from: Date;
  to: Date;
}

interface CashFlowChartProps {
  currency?: string;
  /** When set, chart data is filtered to this range (dashboard unified filter). */
  dateRange?: DashboardDateRange;
}

export default function CashFlowChart({ currency: currencyProp, dateRange }: CashFlowChartProps) {
  const { t, locale } = useI18n();
  const { fmt, fmtAxis, selected } = useCurrency();
  const isAr = locale === "ar";
  const currency = currencyProp ?? selected;
  const d = t.dashboard;

  const [timeRange, setTimeRange] = useState<TimeRangeKey>("6m");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const data = useMemo(() => {
    if (dateRange) return getDataForDateRange(dateRange, isAr);
    return getDataForRange(timeRange, isAr);
  }, [dateRange, timeRange, isAr]);
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2 pt-5 px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{d.cashEvolution}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{d.cashEvolutionSub}</p>
          </div>
          <div className="flex items-center gap-3">
            {!dateRange && <TimeRangeButtons value={timeRange} onChange={setTimeRange} isAr={isAr} />}
            <ChartExportButton chartRef={chartContainerRef} downloadLabel="cash-evolution" isAr={isAr} />
            <Badge variant="outline" className="text-[10px] font-medium" suppressHydrationWarning>
              {currency}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={dateRange ? `${dateRange.from.getTime()}-${dateRange.to.getTime()}` : timeRange}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            ref={chartContainerRef}
            className="w-full"
          >
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <filter id="cashChartGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="month" {...chartXAxisProps} />
                <YAxis {...chartYAxisProps} width={56} tickFormatter={fmtAxis} />
                <Tooltip
                  content={<TooltipContent fmt={fmt} data={data} isAr={isAr} />}
                  cursor={chartTooltipCursor}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
                <Bar
                  dataKey="inflow"
                  name={d.inflow}
                  fill="#34d399"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive
                  animationDuration={300}
                  activeBar={{ stroke: "hsl(142 71% 45%)", strokeWidth: 2.5, filter: "url(#cashChartGlow)" }}
                />
                <Bar
                  dataKey="outflow"
                  name={d.outflow}
                  fill="#fb7185"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive
                  animationDuration={300}
                  activeBar={{ stroke: "hsl(346 77% 72%)", strokeWidth: 2.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name={d.balanceLine}
                  stroke="#818cf8"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--background)", stroke: "#818cf8", strokeWidth: 2 }}
                  activeDot={(props: any) => {
                    const { cx, cy } = props;
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={10} fill="#818cf8" opacity={0.35} filter="url(#cashChartGlow)" />
                        <circle cx={cx} cy={cy} r={7} fill="#818cf8" stroke="var(--background)" strokeWidth={2} />
                      </g>
                    );
                  }}
                  isAnimationActive
                  animationDuration={300}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
