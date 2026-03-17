"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { cn } from "@/lib/utils";

interface MobileOptimizedViewProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export function MobileOptimizedView({
  title,
  children,
  defaultExpanded = false,
  className,
}: MobileOptimizedViewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("md:hidden border rounded-lg overflow-hidden", className)}>
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm font-semibold">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
      {isExpanded && <div className="p-4 border-t">{children}</div>}
    </div>
  );
}

interface MobileKpiCardProps {
  label: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

export function MobileKpiCard({ label, value, trend, icon }: MobileKpiCardProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </div>
      {trend && (
        <div
          className={cn(
            "text-xs font-medium px-2 py-1 rounded",
            trend.isPositive
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 text-red-700 dark:text-red-300"
          )}
        >
          {trend.value}
        </div>
      )}
    </div>
  );
}

interface MobileChartWrapperProps {
  children: React.ReactNode;
  height?: string;
}

export function MobileChartWrapper({ children, height = "300px" }: MobileChartWrapperProps) {
  return (
    <div className="md:hidden -mx-4 px-4 overflow-x-auto">
      <div style={{ minWidth: "600px", height }}>{children}</div>
    </div>
  );
}
