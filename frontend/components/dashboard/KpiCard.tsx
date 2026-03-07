import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
    icon?: LucideIcon;
  };
  dotColor?: string;
  gradient?: string;
}

export function KpiCard({
  label,
  value,
  subtitle,
  change,
  dotColor = "bg-zinc-400",
  gradient,
}: KpiCardProps) {
  const trendColors = {
    up: "text-emerald-500 bg-emerald-500/10",
    down: "text-rose-500 bg-rose-500/10",
    neutral: "text-indigo-500 bg-indigo-500/10",
  };

  const ChangeIcon = change?.icon;

  return (
    <Card
      className={cn(
        "shadow-sm border-border/50 overflow-hidden",
        gradient
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide leading-none">
            {label}
          </p>
        </div>
        <p
          suppressHydrationWarning
          className="text-xl font-bold tabular-nums tracking-tight leading-none"
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
        )}
        {change && (
          <div
            className={cn(
              "px-2 py-0.5 rounded-md text-xs font-medium w-fit mt-2 flex items-center gap-1",
              trendColors[change.trend]
            )}
          >
            {ChangeIcon && <ChangeIcon className="h-3 w-3" />}
            {change.value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
