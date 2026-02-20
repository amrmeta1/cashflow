"use client";

import { useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PayableStatus = "chaotic" | "optimizing" | "optimized";

export type BatchGroup = "early_pay" | "standard" | "smart_delay";

export interface Payable {
  id: string;
  vendor: string;
  vendor_ar: string;
  amount: number;
  originalDueDate: string;
  terms: string;
  /** Populated after optimization */
  batchGroup?: BatchGroup;
  /** SAR saved via early discount (early_pay only) */
  discountSaved?: number;
  /** Days delayed (smart_delay only) */
  delayedToDays?: number;
}

export interface OptimizationResult {
  cashPreserved: number;
  discountsCaptured: number;
}

export interface UsePayablesReturn {
  payables: Payable[];
  status: PayableStatus;
  optimizationResult: OptimizationResult | null;
  terminalLine: string;
  runOptimization: () => void;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const today = new Date();
const daysOut = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const RAW_PAYABLES: Payable[] = [
  {
    id: "pay-001",
    vendor: "Dell Computers KSA",
    vendor_ar: "ديل للحاسبات — المملكة",
    amount: 48_000,
    originalDueDate: daysOut(8),
    terms: "2/10 Net 30",
  },
  {
    id: "pay-002",
    vendor: "STC Cloud Services",
    vendor_ar: "STC للخدمات السحابية",
    amount: 12_500,
    originalDueDate: daysOut(14),
    terms: "Net 30",
  },
  {
    id: "pay-003",
    vendor: "Gulf Consulting LLC",
    vendor_ar: "شركة الخليج للاستشارات",
    amount: 75_000,
    originalDueDate: daysOut(22),
    terms: "Net 45",
  },
  {
    id: "pay-004",
    vendor: "National Steel Co.",
    vendor_ar: "الشركة الوطنية للصلب",
    amount: 85_000,
    originalDueDate: daysOut(5),
    terms: "2/10 Net 30",
  },
  {
    id: "pay-005",
    vendor: "Office Depot Arabia",
    vendor_ar: "أوفيس ديبو العربية",
    amount: 24_500,
    originalDueDate: daysOut(18),
    terms: "Net 30",
  },
];

// ── AI optimization logic ─────────────────────────────────────────────────────

/**
 * Assigns each payable to a batch group and calculates savings.
 *
 * Rules:
 * - "2/10 Net 30" terms AND due within 10 days → early_pay (2% discount)
 * - Due within 15 days, no discount → standard
 * - Net 30+ with due date > 15 days → smart_delay (push to day 29)
 */
function optimizePayables(payables: Payable[]): Payable[] {
  return payables.map((p) => {
    const dueDate = new Date(p.originalDueDate);
    const daysUntilDue = Math.round(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const hasEarlyDiscount = p.terms.startsWith("2/10");

    if (hasEarlyDiscount && daysUntilDue <= 10) {
      return {
        ...p,
        batchGroup: "early_pay" as BatchGroup,
        discountSaved: Math.round(p.amount * 0.02),
      };
    }

    if (daysUntilDue > 15 && (p.terms === "Net 30" || p.terms === "Net 45")) {
      return {
        ...p,
        batchGroup: "smart_delay" as BatchGroup,
        delayedToDays: 29,
      };
    }

    return { ...p, batchGroup: "standard" as BatchGroup };
  });
}

function calcResult(optimized: Payable[]): OptimizationResult {
  const cashPreserved = optimized
    .filter((p) => p.batchGroup === "smart_delay")
    .reduce((sum, p) => sum + p.amount, 0);

  const discountsCaptured = optimized
    .filter((p) => p.batchGroup === "early_pay")
    .reduce((sum, p) => sum + (p.discountSaved ?? 0), 0);

  return { cashPreserved, discountsCaptured };
}

// ── Terminal lines cycled during "optimizing" state ───────────────────────────

const TERMINAL_LINES = [
  "Mustashar AI analyzing vendor contracts…",
  "Calculating early-payment yields…",
  "Maximizing Days Payable Outstanding (DPO)…",
  "Scoring cash-flow impact per batch…",
  "Finalizing optimal payment schedule…",
];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePayables(): UsePayablesReturn {
  const [payables, setPayables] = useState<Payable[]>(RAW_PAYABLES);
  const [status, setStatus] = useState<PayableStatus>("chaotic");
  const [optimizationResult, setOptimizationResult] =
    useState<OptimizationResult | null>(null);
  const [terminalLine, setTerminalLine] = useState(TERMINAL_LINES[0]);

  const runOptimization = useCallback(() => {
    if (status !== "chaotic") return;

    setStatus("optimizing");

    // Cycle terminal lines every 500ms over 2.5s total
    let lineIdx = 0;
    const interval = setInterval(() => {
      lineIdx = (lineIdx + 1) % TERMINAL_LINES.length;
      setTerminalLine(TERMINAL_LINES[lineIdx]);
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      const optimized = optimizePayables(RAW_PAYABLES);
      const result = calcResult(optimized);
      setPayables(optimized);
      setOptimizationResult(result);
      setStatus("optimized");
    }, 2500);
  }, [status]);

  return { payables, status, optimizationResult, terminalLine, runOptimization };
}
