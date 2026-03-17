"use client";

import { useCurrency, CURRENCY_ORDER, CURRENCIES } from "@/contexts/CurrencyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CurrencySelector() {
  const { selected, setCurrency, info } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 h-8",
            "bg-muted/40 dark:bg-zinc-800/50 border-border/60",
            "hover:bg-muted/60 dark:hover:bg-zinc-800/70 hover:border-emerald-500/30",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-2 focus:ring-offset-background",
            "transition-all duration-200 text-xs font-medium",
          )}
        >
          <span className="text-base leading-none" aria-hidden>
            {info.flag}
          </span>
          <span className="tabular-nums">{selected}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {CURRENCY_ORDER.map((code) => (
          <DropdownMenuItem key={code} onClick={() => setCurrency(code)}>
            {CURRENCIES[code].flag} {code}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
