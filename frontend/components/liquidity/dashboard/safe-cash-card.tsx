"use client";

import { ShieldCheck, Lock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/shared/ui/card";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useCashPosition } from "@/lib/hooks/useCashPosition";
import { cn } from "@/lib/utils";

// TODO: VAT_LIABILITY — derive from tagged VAT transactions / ZATCA obligations when available
const VAT_LIABILITY = 18_500;
// TODO: PAYROLL — derive from upcoming payables / payroll schedule when available
const PAYROLL = 45_000;
// TODO: BUFFER — derive from tenant-level "reserve" or settings when available
const BUFFER = 10_000;

// ── Label maps ───────────────────────────────────────────────────────────────

const LABELS_EN = {
  safe:    "Safe to Spend",
  vat:     "VAT Liability",
  payroll: "Payroll",
  buffer:  "Buffer Fund",
} as const;

const LABELS_AR = {
  safe:    "متاح للإنفاق",
  vat:     "التزام ضريبة القيمة المضافة",
  payroll: "الرواتب",
  buffer:  "صندوق الطوارئ",
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function pct(n: number, total: number) {
  if (total <= 0) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface SafeCashCardProps {
  isAr?: boolean;
  currency?: string;
  taxAuthority?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SafeCashCard({ isAr = false, currency = "SAR", taxAuthority = "ZATCA" }: SafeCashCardProps) {
  const { currentTenant } = useTenant();
  const { totalBalance, isLoading } = useCashPosition(currentTenant?.id);

  const TOTAL_BALANCE = totalBalance;
  const SAFE_CASH = Math.max(0, TOTAL_BALANCE - VAT_LIABILITY - PAYROLL - BUFFER);

  const SEGMENTS = [
    { key: "safe" as const, amount: SAFE_CASH, color: "bg-emerald-500", dotColor: "bg-emerald-500", locked: false },
    { key: "vat" as const, amount: VAT_LIABILITY, color: "bg-amber-500/80", dotColor: "bg-amber-500", locked: true },
    { key: "payroll" as const, amount: PAYROLL, color: "bg-blue-500/80", dotColor: "bg-blue-500", locked: true },
    { key: "buffer" as const, amount: BUFFER, color: "bg-purple-500/80", dotColor: "bg-purple-500", locked: true },
  ];

  const labels = isAr ? LABELS_AR : LABELS_EN;

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900/50 dark:to-background border-primary/20">
        <CardContent className="px-5 py-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
            <span className="font-semibold tracking-tight text-lg">{isAr ? "رصيد الإنفاق الآمن — AI" : "AI Safe-to-Spend Balance"}</span>
          </div>
          <Skeleton className="h-12 w-32 mt-4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900/50 dark:to-background border-primary/20">
      <CardContent className="px-5 py-5">

        {/* ── Header row ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
            <span className="font-semibold tracking-tight text-lg">
              {isAr ? "رصيد الإنفاق الآمن — AI" : "AI Safe-to-Spend Balance"}
            </span>
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {isAr
              ? `الرصيد الإجمالي: ${currency} ${fmt(TOTAL_BALANCE)}`
              : `Gross Bank Balance: ${currency} ${fmt(TOTAL_BALANCE)}`}
          </span>
        </div>

        {/* ── Main number ── */}
        <div className="mt-4 flex items-end gap-3 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-normal text-muted-foreground">{currency}</span>
            <span className="text-4xl lg:text-5xl font-bold tabular-nums tracking-tighter text-foreground">
              {fmt(SAFE_CASH)}
            </span>
          </div>
          <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md text-xs mb-1">
            {isAr ? "متاح للعمليات والنمو" : "Available for operations & growth"}
          </span>
        </div>

        {/* ── Stacked progress bar ── */}
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex mt-6">
          {SEGMENTS.map((seg) => (
            <div
              key={seg.key}
              className={cn("h-full transition-all", seg.color)}
              style={{ width: pct(seg.amount, TOTAL_BALANCE || 1) }}
              title={`${labels[seg.key]}: ${currency} ${fmt(seg.amount)}`}
            />
          ))}
        </div>

        {/* ── Legend grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
          {SEGMENTS.map((seg) => (
            <div key={seg.key} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full shrink-0", seg.dotColor)} />
                <span className="text-xs text-muted-foreground">
                  {labels[seg.key]}
                </span>
                {seg.locked && (
                  <Lock className="w-3 h-3 text-muted-foreground ms-0.5 shrink-0" />
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums ps-3.5">
                {currency} {fmt(seg.amount)}
              </span>
              <span className="text-[10px] text-muted-foreground ps-3.5 tabular-nums">
                {pct(seg.amount, TOTAL_BALANCE || 1)}
              </span>
            </div>
          ))}
        </div>

        {/* ── AI Insight banner ── */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-sm p-3 rounded-md mt-5 flex items-start gap-2 border border-blue-100 dark:border-blue-900/50">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            {isAr
              ? "رؤية مستشار AI: التزام ضريبة القيمة المضافة للربع الأول مستحق خلال ١٨ يومًا. قمنا تلقائيًا بتجميد ١٨٬٥٠٠ ريال من ميزانيتك التشغيلية لضمان الامتثال وتجنب غرامات هيئة الزكاة والضريبة والجمارك."
              : `Mustashar AI Insight: Your Q1 VAT liability is due in 18 days. We've automatically locked ${currency} 18,500 from your operational budget to ensure compliance and avoid ${taxAuthority} penalties.`}
          </p>
        </div>

      </CardContent>
    </Card>
  );
}
