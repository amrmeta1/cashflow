"use client";

import { motion } from "framer-motion";
import { Payable } from "@/lib/hooks/usePayables";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtAmount(n: number): string {
  return `SAR ${n.toLocaleString("en-US")}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PayableCardProps {
  payable: Payable;
  isAr: boolean;
  isOptimized: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PayableCard({ payable, isAr, isOptimized }: PayableCardProps) {
  const { vendor, vendor_ar, amount, originalDueDate, terms, batchGroup, discountSaved, delayedToDays } = payable;

  const isEarlyPay = batchGroup === "early_pay";
  const isSmartDelay = batchGroup === "smart_delay";

  return (
    <motion.div
      layout
      layoutId={payable.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ layout: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }, duration: 0.3 }}
      className={[
        "flex items-center justify-between gap-4 p-4 border-b border-border",
        "bg-card hover:bg-muted/50 transition-colors",
        /* Subtle left accent when optimized */
        isOptimized && isEarlyPay  ? "border-s-2 border-s-emerald-500" : "",
        isOptimized && isSmartDelay ? "border-s-2 border-s-violet-500"  : "",
      ].join(" ")}
    >
      {/* ── Vendor + date ── */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">
          {isAr ? vendor_ar : vendor}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isAr ? "تاريخ الاستحقاق:" : "Due:"}{" "}
          <span className="tabular-nums">{fmtDate(originalDueDate)}</span>
        </p>

        {/* Optimized annotations */}
        {isOptimized && isEarlyPay && discountSaved !== undefined && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            + {fmtAmount(discountSaved)} {isAr ? "موفر" : "Saved"}
          </p>
        )}
        {isOptimized && isSmartDelay && delayedToDays !== undefined && (
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mt-1">
            {isAr
              ? `تأجيل بواسطة مستشار إلى اليوم ${delayedToDays}. بدون غرامة.`
              : `Delayed by Mustashar to Day ${delayedToDays}. Zero penalty.`}
          </p>
        )}
      </div>

      {/* ── Terms badge ── */}
      <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums whitespace-nowrap">
        {terms}
      </span>

      {/* ── Amount ── */}
      <p className="shrink-0 text-sm font-semibold font-mono tabular-nums text-end text-foreground">
        {fmtAmount(amount)}
      </p>
    </motion.div>
  );
}
