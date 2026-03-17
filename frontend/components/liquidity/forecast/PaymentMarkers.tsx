"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/shared/ui/tooltip";

interface PaymentEvent {
  month: string;
  type: "payroll" | "subscription" | "vendor";
  label: string;
}

interface PaymentMarkersProps {
  events: PaymentEvent[];
  months: string[];
  isAr: boolean;
}

export function PaymentMarkers({ events, months, isAr }: PaymentMarkersProps) {
  return (
    <div className="absolute top-0 left-0 right-0 flex justify-around px-16 pt-2 pointer-events-none z-10">
      {months.map((month, index) => {
        const monthEvents = events.filter((e) => e.month === month);
        if (monthEvents.length === 0) return <div key={index} className="flex-1" />;

        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            {monthEvents.map((event, i) => (
              <TooltipProvider key={i}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full pointer-events-auto cursor-help shadow-sm",
                        event.type === "payroll"
                          ? "bg-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900"
                          : event.type === "subscription"
                          ? "bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900"
                          : "bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900"
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-medium">{event.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        );
      })}
    </div>
  );
}
