"use client";

import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

/** Displays an amount in the selected currency (SAR base). */
export function Amt({
  amountInSAR,
  className,
  showSign,
}: {
  amountInSAR: number;
  className?: string;
  showSign?: boolean;
}) {
  const { fmt } = useCurrency();
  const s = fmt(amountInSAR);
  const display = showSign && amountInSAR > 0 ? `+${s}` : amountInSAR < 0 ? s : s;
  return <span className={cn("tabular-nums", className)} dir="ltr">{display}</span>;
}
