"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/shared/ui/dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Label } from "@/components/shared/ui/label";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { Scenario } from "@/contexts/ScenarioContext";
import { useForecast } from "@/lib/hooks/useForecast";
import { getTenantId } from "@/lib/api/client";

export type SimulationType = "delay" | "split" | "accelerate";

interface SimulateResult {
  deltaCash: number;
  originalForecast: number[];
  newForecast: number[];
  riskLevel: "high" | "medium" | "low";
  confidence: number;
}

function simulationTypeToScenarioType(
  simType: SimulationType
): Scenario["type"] {
  if (simType === "delay") return "delay_payment";
  if (simType === "split") return "split_payment";
  return "accelerate_receivable";
}

const TYPE_OPTIONS: { value: SimulationType; labelAr: string; labelEn: string }[] = [
  { value: "delay", labelAr: "تأخير الدفع", labelEn: "Delay payment" },
  { value: "split", labelAr: "تقسيم الدفع", labelEn: "Split payment" },
  { value: "accelerate", labelAr: "تسريع التحصيل", labelEn: "Accelerate receivable" },
];

/** 
 * Temporary simulation using real baseline from API.
 * Applies simple delta to demonstrate scenario impact.
 */
function getSimulationResult(
  baselineForecast: number[],
  _scenario: SimulationType,
  days: number,
  percent: number
): SimulateResult {
  const delta = Math.round(15_000 + days * 200 + percent * 100);
  const newF = baselineForecast.map((v, i) => v + Math.round((delta * (i + 1)) / baselineForecast.length));
  return {
    deltaCash: delta,
    originalForecast: baselineForecast,
    newForecast: newF,
    riskLevel: delta >= 20_000 ? "low" : delta >= 10_000 ? "medium" : "high",
    confidence: Math.min(95, 75 + Math.floor(percent / 5)),
  };
}

type Phase = "initial" | "loading" | "result";

function riskLabel(riskLevel: SimulateResult["riskLevel"], isAr: boolean): string {
  if (riskLevel === "high") return isAr ? "عالي" : "High";
  if (riskLevel === "medium") return isAr ? "متوسط" : "Medium";
  return isAr ? "منخفض" : "Low";
}

interface SimulationModalProps {
  open: boolean;
  onClose: () => void;
  /** Called when user clicks Apply Scenario with full Scenario for context */
  onApply?: (scenario: Scenario) => void;
}

export function SimulationModal({ open, onClose, onApply }: SimulationModalProps) {
  const { fmt } = useCurrency();
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const tenantId = getTenantId();
  const { data: forecastData, isLoading: forecastLoading } = useForecast(tenantId);

  const [phase, setPhase] = useState<Phase>("initial");
  const [simType, setSimType] = useState<SimulationType>("delay");
  const [days, setDays] = useState("7");
  const [percent, setPercent] = useState("50");
  const [result, setResult] = useState<SimulateResult | null>(null);

  useEffect(() => {
    if (open) {
      setPhase("initial");
      setResult(null);
    }
  }, [open]);

  const runSimulation = useCallback(() => {
    if (!forecastData || forecastData.forecast.length === 0) {
      return;
    }

    setPhase("loading");
    const daysNum = Math.max(1, Math.min(90, parseInt(days, 10) || 7));
    const percentNum = Math.max(0, Math.min(100, parseInt(percent, 10) || 50));

    setTimeout(() => {
      // Use real forecast baseline from API (convert 13 weeks to 7 days for now)
      const weeklyBaseline = forecastData.forecast.slice(0, 2).map((p: any) => p.baseline);
      // Pad to 7 days if needed
      const baseline7Days = weeklyBaseline.length >= 7 
        ? weeklyBaseline.slice(0, 7)
        : [...weeklyBaseline, ...Array(7 - weeklyBaseline.length).fill(weeklyBaseline[weeklyBaseline.length - 1] || 0)];
      
      const simResult = getSimulationResult(baseline7Days, simType, daysNum, percentNum);
      setResult(simResult);
      setPhase("result");
    }, 900);
  }, [simType, days, percent, forecastData]);

  const tryAnother = useCallback(() => {
    setResult(null);
    setPhase("initial");
  }, []);

  const handleApply = useCallback(() => {
    if (result) {
      const scenario: Scenario = {
        id: crypto.randomUUID(),
        type: simulationTypeToScenarioType(simType),
        deltaCash: result.deltaCash,
        newForecast: result.newForecast,
        riskLevel: result.riskLevel,
        confidence: result.confidence,
      };
      onApply?.(scenario);
      onClose();
    }
  }, [result, simType, onApply, onClose]);

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (!o) {
        if (phase === "loading") return;
        setPhase("initial");
        setResult(null);
        onClose();
      }
    },
    [phase, onClose]
  );

  const hasNoData = !forecastLoading && (!forecastData || forecastData.forecast.length === 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isAr ? "محاكاة التدفق النقدي" : "Cash Flow Simulation"}</DialogTitle>
          <DialogDescription>
            {hasNoData && (isAr ? "لا توجد بيانات معاملات لإجراء المحاكاة." : "No transaction data available for simulation.")}
            {!hasNoData && phase === "initial" &&
              (isAr ? "اختر نوع المحاكاة والمعاملات." : "Select simulation type and inputs.")}
            {phase === "loading" && (isAr ? "جاري التشغيل…" : "Running…")}
            {phase === "result" && (isAr ? "النتيجة جاهزة." : "Result ready.")}
          </DialogDescription>
        </DialogHeader>

        {hasNoData && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {isAr 
                ? "قم برفع كشف حساب بنكي لرؤية التنبؤات وإجراء المحاكاة."
                : "Upload a bank statement to see forecasts and run simulations."}
            </p>
            <Button variant="outline" onClick={onClose}>
              {isAr ? "إغلاق" : "Close"}
            </Button>
          </div>
        )}

        {!hasNoData && phase === "initial" && (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {isAr ? "نوع المحاكاة" : "Simulation type"}
              </Label>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={simType === opt.value ? "default" : "outline"}
                    onClick={() => setSimType(opt.value)}
                  >
                    {isAr ? opt.labelAr : opt.labelEn}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sim-days" className="text-xs">
                  {isAr ? "عدد الأيام" : "Number of days"}
                </Label>
                <Input
                  id="sim-days"
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sim-pct" className="text-xs">
                  {isAr ? "نسبة التقسيم %" : "Split %"}
                </Label>
                <Input
                  id="sim-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={onClose}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={runSimulation} disabled={!forecastData || forecastData.forecast.length === 0}>
                {isAr ? "تشغيل المحاكاة" : "Run simulation"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {!hasNoData && phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isAr ? "جاري حساب السيناريو…" : "Calculating scenario…"}
            </p>
          </div>
        )}

        {!hasNoData && phase === "result" && result && (
          <div className="grid gap-4 py-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isAr ? "النتيجة" : "Result"}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">{isAr ? "فرق السيولة:" : "Delta Cash:"}</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums text-end",
                    result.deltaCash >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  )}
                  dir="ltr"
                >
                  {result.deltaCash >= 0 ? "+" : ""}{fmt(result.deltaCash)}
                </span>
                <span className="text-muted-foreground">{isAr ? "مستوى المخاطر:" : "Risk Level:"}</span>
                <span className="font-medium text-end">{riskLabel(result.riskLevel, isAr)}</span>
                <span className="text-muted-foreground">{isAr ? "الثقة:" : "Confidence:"}</span>
                <span className="font-medium tabular-nums text-end">{result.confidence}%</span>
              </div>
            </div>

            {/* Mini forecast comparison (placeholder bars) */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isAr ? "مقارنة التوقعات (7 أيام)" : "Forecast comparison (7 days)"}
              </p>
              <MiniForecastChart
                original={result.originalForecast}
                scenario={result.newForecast}
                fmt={fmt}
              />
            </div>

            <DialogFooter className="pt-2 flex-wrap gap-2">
              <Button variant="outline" onClick={onClose}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button variant="outline" onClick={tryAnother}>
                {isAr ? "تجربة أخرى" : "Try another"}
              </Button>
              <Button onClick={handleApply}>
                {isAr ? "تطبيق السيناريو" : "Apply scenario"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Simple bar comparison for original vs scenario (7 days). */
function MiniForecastChart({
  original,
  scenario,
  fmt,
}: {
  original: number[];
  scenario: number[];
  fmt: (n: number) => string;
}) {
  const min = Math.min(...original, ...scenario);
  const max = Math.max(...original, ...scenario);
  const range = max - min || 1;

  return (
    <div className="space-y-2">
      <div className="flex gap-1 h-6 items-end" aria-hidden>
        {original.map((v, i) => (
          <div
            key={`o-${i}`}
            className="flex-1 min-w-0 rounded-t bg-muted-foreground/30"
            style={{ height: `${((v - min) / range) * 80 + 10}%` }}
            title={fmt(v)}
          />
        ))}
      </div>
      <div className="flex gap-1 h-6 items-end" aria-hidden>
        {scenario.map((v, i) => (
          <div
            key={`s-${i}`}
            className="flex-1 min-w-0 rounded-t bg-emerald-500/70"
            style={{ height: `${((v - min) / range) * 80 + 10}%` }}
            title={fmt(v)}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground gap-2">
        <span>Base</span>
        <span>Scenario</span>
      </div>
    </div>
  );
}
