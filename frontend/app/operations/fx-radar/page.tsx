"use client";

import { AlertTriangle, Globe, TrendingDown, ShieldOff } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/ui/table";
import { Badge } from "@/components/shared/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ExposureChart, type CurrencySlice } from "@/components/operations/fx-radar/ExposureChart";
import type { ChartConfig } from "@/components/shared/ui/chart";

// ── Mock data ─────────────────────────────────────────────────────────────────

const CHART_DATA: CurrencySlice[] = [
  { currency: "USD", amount: 850_000, fill: "var(--color-usd)" },
  { currency: "EUR", amount: 420_000, fill: "var(--color-eur)" },
  { currency: "GBP", amount: 150_000, fill: "var(--color-gbp)" },
];

const CHART_CONFIG: ChartConfig = {
  usd: { label: "USD", color: "hsl(var(--chart-1))" },
  eur: { label: "EUR", color: "hsl(var(--chart-2))" },
  gbp: { label: "GBP", color: "hsl(var(--chart-3))" },
};

interface FXPayable {
  id: string;
  vendor: string;
  vendor_ar: string;
  dueIn: string;
  dueIn_ar: string;
  foreignAmount: string;
  baseAmount: number; // SAR
  risk: "high" | "safe" | "monitor";
}

const FX_PAYABLES: FXPayable[] = [
  {
    id: "fx-001",
    vendor: "Siemens AG",
    vendor_ar: "سيمنز AG",
    dueIn: "In 12 Days",
    dueIn_ar: "خلال ١٢ يومًا",
    foreignAmount: "€95,000",
    baseAmount: 399_000,
    risk: "high",
  },
  {
    id: "fx-002",
    vendor: "AWS Ireland",
    vendor_ar: "AWS أيرلندا",
    dueIn: "In 25 Days",
    dueIn_ar: "خلال ٢٥ يومًا",
    foreignAmount: "$110,000",
    baseAmount: 412_500,
    risk: "safe",
  },
  {
    id: "fx-003",
    vendor: "London Consulting",
    vendor_ar: "لندن للاستشارات",
    dueIn: "In 5 Days",
    dueIn_ar: "خلال ٥ أيام",
    foreignAmount: "£25,000",
    baseAmount: 119_500,
    risk: "monitor",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function RiskBadge({ risk, isAr }: { risk: FXPayable["risk"]; isAr: boolean }) {
  if (risk === "high")
    return (
      <Badge variant="destructive" className="gap-1 whitespace-nowrap">
        🔴 {isAr ? "مخاطرة عالية" : "High Risk"}
      </Badge>
    );
  if (risk === "safe")
    return (
      <Badge variant="outline" className="gap-1 whitespace-nowrap text-muted-foreground">
        ⚪ {isAr ? "مربوط / آمن" : "Pegged / Safe"}
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1 whitespace-nowrap border-amber-500/40 text-amber-600 dark:text-amber-400">
      🟡 {isAr ? "مراقبة" : "Monitor"}
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FXRadarPage() {
  const { locale, dir } = useI18n();
  const { fmt } = useCurrency();
  const isAr = locale === "ar";

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── Page title ── */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isAr ? "رادار مخاطر العملات الأجنبية" : "AI FX Risk & Multi-Currency Radar"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "يرصد مستشار AI تعرضك للعملات الأجنبية ويوصي بإجراءات التحوط."
              : "Mustashar AI monitors your FX exposure and recommends hedging actions."}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            AI PROACTIVE ALERT BANNER
        ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex items-start sm:items-center flex-col sm:flex-row gap-4">
          <AlertTriangle className="text-amber-500 w-6 h-6 animate-pulse shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            {isAr ? (
              <>
                <span className="font-semibold">تنبيه مستشار AI:</span> سعر صرف EUR/SAR في ارتفاع (+١.٤٪ هذا الأسبوع). نوصي بشدة بتسوية فاتورة €٩٥,٠٠٠ لـ «Siemens AG» اليوم لتجنب{" "}
                <span className="font-bold">{fmt(5400)}</span>.
              </>
            ) : (
              <>
                <span className="font-semibold">Mustashar AI Alert:</span> The EUR/SAR exchange rate is trending UP (+1.4% this week). We strongly recommend settling the €95,000 invoice to &apos;Siemens AG&apos; today to avoid a projected{" "}
                <span className="font-bold">{fmt(5400)} FX loss</span>.
              </>
            )}
          </p>
          <Button
            size="sm"
            className="ms-auto shrink-0 gap-1.5 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]"
          >
            ⚡ {isAr ? "تنفيذ دفع EUR الآن" : "Execute EUR Payment Now"}
          </Button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            KPI CARDS ROW
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1 — Total Exposure */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                {isAr ? "إجمالي التعرض الأجنبي" : "Total Foreign Exposure"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums tracking-tighter">
                {fmt(1_420_000)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "USD · EUR · GBP" : "USD · EUR · GBP"}
              </p>
            </CardContent>
          </Card>

          {/* Card 2 — VaR */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-3.5 w-3.5" />
                {isAr ? "القيمة المعرضة للخطر (٣٠ يومًا)" : "Value at Risk (VaR — 30 Days)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums tracking-tighter text-destructive">
                {fmt(12_400)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "الحد الأقصى للخسارة المقدرة" : "Estimated max loss"}
              </p>
            </CardContent>
          </Card>

          {/* Card 3 — Active Hedges */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <ShieldOff className="h-3.5 w-3.5" />
                {isAr ? "التحوطات النشطة" : "Active Hedges"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums tracking-tighter text-muted-foreground">
                {fmt(0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? "٠٪ من التعرض محمي" : "0% exposure protected"}
              </p>
            </CardContent>
          </Card>

        </div>

        {/* ══════════════════════════════════════════════════════════════════
            DATA VISUALIZATIONS GRID
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Donut Chart (col-span-1) ── */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {isAr ? "توزيع العملات" : "Currency Allocation"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExposureChart data={CHART_DATA} config={CHART_CONFIG} isAr={isAr} fmt={fmt} />
            </CardContent>
          </Card>

          {/* ── Vulnerable FX Payables Table (col-span-2) ── */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {isAr ? "المدفوعات الأجنبية المعرضة للخطر" : "Vulnerable FX Payables"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start ps-4">
                      {isAr ? "المورد" : "Vendor"}
                    </TableHead>
                    <TableHead className="text-start">
                      {isAr ? "تاريخ الاستحقاق" : "Due Date"}
                    </TableHead>
                    <TableHead className="text-end">
                      {isAr ? "المبلغ الأجنبي" : "Foreign Amount"}
                    </TableHead>
                    <TableHead className="text-end">
                      {isAr ? "المبلغ بالريال" : "Base (SAR)"}
                    </TableHead>
                    <TableHead className="text-end pe-4">
                      {isAr ? "مستوى الخطر" : "Risk Level"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FX_PAYABLES.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium ps-4 text-start">
                        {isAr ? row.vendor_ar : row.vendor}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground text-start">
                        {isAr ? row.dueIn_ar : row.dueIn}
                      </TableCell>
                      <TableCell className="tabular-nums font-mono text-end font-semibold">
                        {row.foreignAmount}
                      </TableCell>
                      <TableCell className="tabular-nums font-mono text-end text-muted-foreground">
                        {fmt(row.baseAmount)}
                      </TableCell>
                      <TableCell className="text-end pe-4">
                        <RiskBadge risk={row.risk} isAr={isAr} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
