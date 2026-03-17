"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type TimeRangeKey = "3m" | "6m" | "12m" | "all";

const OPTIONS: { key: TimeRangeKey; labelEn: string; labelAr: string }[] = [
  { key: "3m", labelEn: "3 Months", labelAr: "٣ أشهر" },
  { key: "6m", labelEn: "6 Months", labelAr: "٦ أشهر" },
  { key: "12m", labelEn: "12 Months", labelAr: "١٢ شهر" },
  { key: "all", labelEn: "All", labelAr: "الكل" },
];

interface TimeRangeButtonsProps {
  value: TimeRangeKey;
  onChange: (key: TimeRangeKey) => void;
  isAr: boolean;
  className?: string;
}

/** Clean segmented control: 4 buttons, active = neon green + white, Framer Motion transitions */
export function TimeRangeButtons({ value, onChange, isAr, className }: TimeRangeButtonsProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap rounded-lg p-0.5 bg-muted/60 border border-border/50",
        className
      )}
      role="tablist"
      aria-label={isAr ? "الفترة الزمنية" : "Time range"}
    >
      {OPTIONS.map((opt) => {
        const isActive = value === opt.key;
        return (
          <motion.button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              isActive
                ? "bg-emerald-500 text-white [box-shadow:0_0_14px_rgba(16,185,129,0.5),0_0_0_1px_rgba(16,185,129,0.3)]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {isAr ? opt.labelAr : opt.labelEn}
          </motion.button>
        );
      })}
    </div>
  );
}
