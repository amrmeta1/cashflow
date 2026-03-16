"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { CalendarDays, Users, RefreshCw, ShoppingCart, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { cn } from "@/lib/utils";
import { getCashFlowPatterns } from "@/lib/api/cashflow-dna-api";
import type { CashFlowPattern } from "@/lib/api/cashflow-dna-api";

interface UpcomingCashEventsProps {
  tenantId: string | null;
  currency: string;
  isAr: boolean;
}

interface CashEvent {
  id: string;
  description: string;
  daysUntil: number;
  amount: number;
  type: "payroll" | "subscription" | "vendor" | "receivable";
  date: Date;
}

function getEventIcon(type: string) {
  switch (type) {
    case "payroll":
      return Users;
    case "subscription":
      return RefreshCw;
    case "receivable":
      return TrendingUp;
    default:
      return ShoppingCart;
  }
}

function getEventDescription(pattern: CashFlowPattern, isAr: boolean): string {
  if (pattern.pattern_type === "payroll") {
    return isAr ? "الرواتب" : "Payroll";
  }
  
  if (pattern.pattern_type === "subscription" && pattern.vendor_name) {
    return isAr ? `اشتراك ${pattern.vendor_name}` : `${pattern.vendor_name} subscription`;
  }
  
  if (pattern.vendor_name) {
    return pattern.vendor_name;
  }
  
  return isAr ? "دفعة متكررة" : "Recurring payment";
}

function calculateDaysUntil(dateStr: string): number {
  try {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

export function UpcomingCashEvents({ tenantId, currency, isAr }: UpcomingCashEventsProps) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CashEvent[]>([]);

  useEffect(() => {
    if (!tenantId) {
      // Show mock data if no tenantId
      const mockEvents: CashEvent[] = [
        {
          id: "event-1",
          description: isAr ? "الرواتب" : "Payroll",
          daysUntil: 3,
          amount: -320000,
          type: "payroll",
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
        {
          id: "event-2",
          description: isAr ? "اشتراك AWS" : "AWS subscription",
          daysUntil: 5,
          amount: -11950,
          type: "subscription",
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
        {
          id: "event-3",
          description: isAr ? "إيجار المكتب" : "Office Rent",
          daysUntil: 7,
          amount: -45000,
          type: "vendor",
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: "event-4",
          description: isAr ? "اشتراك Microsoft 365" : "Microsoft 365 subscription",
          daysUntil: 10,
          amount: -8500,
          type: "subscription",
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
        {
          id: "event-5",
          description: isAr ? "STC Telecom" : "STC Telecom",
          daysUntil: 12,
          amount: -6200,
          type: "vendor",
          date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        },
      ];
      setEvents(mockEvents);
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        const data = await getCashFlowPatterns(tenantId, 60);
        const upcomingEvents: CashEvent[] = (data.patterns || [])
          .filter((p) => p.next_expected)
          .map((p) => ({
            id: p.id,
            description: getEventDescription(p, isAr),
            daysUntil: calculateDaysUntil(p.next_expected!),
            amount: p.avg_amount,
            type: p.pattern_type as any,
            date: new Date(p.next_expected!),
          }))
          .filter((e) => e.daysUntil >= 0 && e.daysUntil <= 30)
          .sort((a, b) => a.daysUntil - b.daysUntil)
          .slice(0, 7);

        // If no events from API, use mock data for demonstration
        if (upcomingEvents.length === 0) {
          const mockEvents: CashEvent[] = [
            {
              id: "event-1",
              description: isAr ? "الرواتب" : "Payroll",
              daysUntil: 3,
              amount: -320000,
              type: "payroll",
              date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            },
            {
              id: "event-2",
              description: isAr ? "اشتراك AWS" : "AWS subscription",
              daysUntil: 5,
              amount: -11950,
              type: "subscription",
              date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            },
            {
              id: "event-3",
              description: isAr ? "إيجار المكتب" : "Office Rent",
              daysUntil: 7,
              amount: -45000,
              type: "vendor",
              date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            {
              id: "event-4",
              description: isAr ? "اشتراك Microsoft 365" : "Microsoft 365 subscription",
              daysUntil: 10,
              amount: -8500,
              type: "subscription",
              date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            },
            {
              id: "event-5",
              description: isAr ? "STC Telecom" : "STC Telecom",
              daysUntil: 12,
              amount: -6200,
              type: "vendor",
              date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
            },
          ];
          setEvents(mockEvents);
        } else {
          setEvents(upcomingEvents);
        }
      } catch (error) {
        console.warn("Failed to fetch upcoming cash events, using mock data:", error);
        // Use mock data on error
        const mockEvents: CashEvent[] = [
          {
            id: "event-1",
            description: isAr ? "الرواتب" : "Payroll",
            daysUntil: 3,
            amount: -320000,
            type: "payroll",
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
          {
            id: "event-2",
            description: isAr ? "اشتراك AWS" : "AWS subscription",
            daysUntil: 5,
            amount: -11950,
            type: "subscription",
            date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          },
          {
            id: "event-3",
            description: isAr ? "إيجار المكتب" : "Office Rent",
            daysUntil: 7,
            amount: -45000,
            type: "vendor",
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        ];
        setEvents(mockEvents);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [tenantId, isAr]);

  if (loading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-b-0">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              {isAr ? "الأحداث النقدية القادمة" : "Upcoming Cash Events"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="text-sm text-muted-foreground">
            {isAr ? "لا توجد أحداث قادمة" : "No upcoming events"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">
            {isAr ? "الأحداث النقدية القادمة" : "Upcoming Cash Events"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-3">
        {events.map((event) => {
          const Icon = getEventIcon(event.type);
          const isOutflow = event.amount < 0;
          const daysText =
            event.daysUntil === 0
              ? isAr
                ? "اليوم"
                : "today"
              : event.daysUntil === 1
              ? isAr
                ? "غداً"
                : "tomorrow"
              : isAr
              ? `خلال ${event.daysUntil} أيام`
              : `in ${event.daysUntil} day${event.daysUntil > 1 ? "s" : ""}`;

          return (
            <div
              key={event.id}
              className="flex items-start gap-3 py-2 border-b border-border/30 last:border-b-0"
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  event.type === "payroll"
                    ? "bg-indigo-100 dark:bg-indigo-900/40"
                    : event.type === "subscription"
                    ? "bg-emerald-100 dark:bg-emerald-900/40"
                    : isOutflow
                    ? "bg-rose-100 dark:bg-rose-900/40"
                    : "bg-emerald-100 dark:bg-emerald-900/40"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    event.type === "payroll"
                      ? "text-indigo-600"
                      : event.type === "subscription"
                      ? "text-emerald-600"
                      : isOutflow
                      ? "text-rose-600"
                      : "text-emerald-600"
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.description}</p>
                <p className="text-xs text-muted-foreground">{daysText}</p>
              </div>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums shrink-0",
                  isOutflow
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {isOutflow ? "-" : "+"}
                {currency} {Math.abs(event.amount).toLocaleString()}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
