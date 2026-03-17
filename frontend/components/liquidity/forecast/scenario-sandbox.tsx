"use client";

import { RotateCcw, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Slider } from "@/components/shared/ui/slider";
import { cn, formatDate } from "@/lib/utils";
import type { SimulationParams } from "./use-forecast-simulation.ts";

interface ScenarioSandboxProps {
  params: SimulationParams;
  setParam: <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => void;
  reset: () => void;
  cashZeroDate: string | null;
  isAr: boolean;
  locale: string;
}

interface SliderRowProps {
  label: string;
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  isAr: boolean;
}

function SliderRow({ label, valueLabel, value, min, max, step, onChange, isAr }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-foreground">{valueLabel}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        dir={isAr ? "rtl" : "ltr"}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/60 tabular-nums">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function ScenarioSandbox({
  params,
  setParam,
  reset,
  cashZeroDate,
  isAr,
  locale,
}: ScenarioSandboxProps) {
  const isDirty =
    params.collectionDelay !== 0 ||
    params.revenueDrop !== 0 ||
    params.expenseSurge !== 0;

  return (
    <Card className="flex flex-col gap-0 overflow-hidden border rounded-md shadow-none">
      {/* ── Header ── */}
      <CardHeader className="px-4 py-3 border-b shrink-0 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <CardTitle className="text-sm font-semibold">
            {isAr ? "صندوق السيناريوهات" : "Scenario Sandbox"}
          </CardTitle>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-primary border-primary/30">
          AI Beta
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 px-4 py-4 flex-1 overflow-y-auto">
        {/* ── Cash Zero Insight Banner ── */}
        {cashZeroDate ? (
          <div className={cn(
            "rounded-md border px-3 py-2.5 flex items-start gap-2.5",
            "bg-destructive/10 border-destructive/20"
          )}>
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-destructive">
                {isAr ? "تحذير: نقص السيولة" : "Cash Zero Warning"}
              </p>
              <p className="text-[11px] text-destructive/80 mt-0.5">
                {isAr
                  ? `الرصيد يصل إلى الصفر بتاريخ ${formatDate(cashZeroDate, locale)}`
                  : `Balance hits zero on ${formatDate(cashZeroDate, locale)}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border px-3 py-2.5 flex items-center gap-2.5 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/40">
            <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-xs font-medium text-green-700 dark:text-green-400">
              {isAr ? "آمن — لا يوجد نقص في السيولة" : "Safe — no cash shortfall detected"}
            </p>
          </div>
        )}

        {/* ── Divider ── */}
        <div className="border-t -mx-4" />

        {/* ── Sliders ── */}
        <div className="space-y-6">
          <SliderRow
            label={isAr ? "تأخير التحصيل" : "Collection Delay"}
            valueLabel={isAr ? `${params.collectionDelay} يوم` : `${params.collectionDelay} days`}
            value={params.collectionDelay}
            min={0}
            max={60}
            step={1}
            onChange={(v) => setParam("collectionDelay", v)}
            isAr={isAr}
          />

          <SliderRow
            label={isAr ? "انخفاض الإيرادات" : "Revenue Drop"}
            valueLabel={`-${params.revenueDrop}%`}
            value={params.revenueDrop}
            min={0}
            max={50}
            step={1}
            onChange={(v) => setParam("revenueDrop", v)}
            isAr={isAr}
          />

          <SliderRow
            label={isAr ? "ارتفاع المصاريف" : "Expense Surge"}
            valueLabel={`+${params.expenseSurge}%`}
            value={params.expenseSurge}
            min={0}
            max={50}
            step={1}
            onChange={(v) => setParam("expenseSurge", v)}
            isAr={isAr}
          />
        </div>

        {/* ── Divider ── */}
        <div className="border-t -mx-4" />

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted/50 px-2 py-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">
              {isAr ? "التأخير" : "Delay"}
            </p>
            <p className="text-xs font-semibold tabular-nums">
              {params.collectionDelay}d
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">
              {isAr ? "الإيرادات" : "Revenue"}
            </p>
            <p className={cn("text-xs font-semibold tabular-nums", params.revenueDrop > 0 && "outflow")}>
              -{params.revenueDrop}%
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">
              {isAr ? "المصاريف" : "Expenses"}
            </p>
            <p className={cn("text-xs font-semibold tabular-nums", params.expenseSurge > 0 && "outflow")}>
              +{params.expenseSurge}%
            </p>
          </div>
        </div>

        {/* ── Reset button ── */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs gap-1.5 text-muted-foreground"
          disabled={!isDirty}
          onClick={reset}
        >
          <RotateCcw className="h-3 w-3" />
          {isAr ? "إعادة تعيين إلى الخط الأساسي" : "Reset to Baseline"}
        </Button>
      </CardContent>
    </Card>
  );
}
