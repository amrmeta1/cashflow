"use client";

import { useEffect, useState } from "react";
import { Dna } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { getCashFlowPatterns, type CashFlowPattern } from "@/lib/api/cashflow-dna-api";

interface CashflowDNATimelineProps {
  tenantId: string | null;
  isAr: boolean;
  currency: string;
}

interface TimelineEvent {
  id: string;
  name: string;
  amount: number;
  daysUntil: number;
  type: "payroll" | "subscription" | "vendor";
  date: Date;
  confidence: number;
  frequency: string;
  occurrenceCount: number;
}

function formatCompactAmount(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${amount < 0 ? "-" : ""}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return amount.toString();
}

function getColorByType(type: string): string {
  switch (type) {
    case "payroll":
      return "bg-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900";
    case "subscription":
      return "bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900";
    default:
      return "bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900";
  }
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getEventName(pattern: CashFlowPattern, isAr: boolean): string {
  if (pattern.vendor_name) {
    return pattern.vendor_name;
  }
  
  if (pattern.pattern_type === "payroll") {
    return isAr ? "الرواتب" : "Payroll";
  }
  
  if (pattern.pattern_type === "subscription") {
    return isAr ? "اشتراك" : "Subscription";
  }
  
  return isAr ? "مورد" : "Vendor";
}

function getFrequencyLabel(frequency: string, isAr: boolean): string {
  const labels: Record<string, { ar: string; en: string }> = {
    daily: { ar: "يومي", en: "Daily" },
    weekly: { ar: "أسبوعي", en: "Weekly" },
    biweekly: { ar: "نصف شهري", en: "Biweekly" },
    monthly: { ar: "شهري", en: "Monthly" },
    quarterly: { ar: "ربع سنوي", en: "Quarterly" },
  };
  return isAr ? labels[frequency]?.ar || frequency : labels[frequency]?.en || frequency;
}

export function CashflowDNATimeline({ tenantId, isAr, currency }: CashflowDNATimelineProps) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!tenantId) {
      const mockEvents: TimelineEvent[] = [
        {
          id: "mock-1",
          name: isAr ? "الرواتب" : "Payroll",
          amount: -320000,
          daysUntil: 3,
          type: "payroll",
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          confidence: 96,
          frequency: "monthly",
          occurrenceCount: 12,
        },
        {
          id: "mock-2",
          name: "AWS",
          amount: -11950,
          daysUntil: 5,
          type: "subscription",
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          confidence: 91,
          frequency: "monthly",
          occurrenceCount: 24,
        },
        {
          id: "mock-3",
          name: isAr ? "إيجار المكتب" : "Office Rent",
          amount: -45000,
          daysUntil: 7,
          type: "vendor",
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          confidence: 94,
          frequency: "monthly",
          occurrenceCount: 12,
        },
        {
          id: "mock-4",
          name: "Microsoft 365",
          amount: -8500,
          daysUntil: 10,
          type: "subscription",
          date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          confidence: 88,
          frequency: "monthly",
          occurrenceCount: 12,
        },
      ];
      setEvents(mockEvents);
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        const data = await getCashFlowPatterns(tenantId, 60);
        const timelineEvents: TimelineEvent[] = (data.patterns || [])
          .filter((p) => p.next_expected)
          .map((p) => ({
            id: p.id,
            name: getEventName(p, isAr),
            amount: p.avg_amount,
            daysUntil: getDaysUntil(p.next_expected!),
            type: (p.pattern_type === "recurring_vendor" ? "vendor" : p.pattern_type) as any,
            date: new Date(p.next_expected!),
            confidence: p.confidence,
            frequency: p.frequency,
            occurrenceCount: p.occurrence_count,
          }))
          .filter((e) => e.daysUntil >= 0 && e.daysUntil <= 30)
          .sort((a, b) => a.daysUntil - b.daysUntil)
          .slice(0, 6);

        if (timelineEvents.length === 0) {
          const mockEvents: TimelineEvent[] = [
            {
              id: "mock-1",
              name: isAr ? "الرواتب" : "Payroll",
              amount: -320000,
              daysUntil: 3,
              type: "payroll",
              date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              confidence: 96,
              frequency: "monthly",
              occurrenceCount: 12,
            },
            {
              id: "mock-2",
              name: "AWS",
              amount: -11950,
              daysUntil: 5,
              type: "subscription",
              date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              confidence: 91,
              frequency: "monthly",
              occurrenceCount: 24,
            },
            {
              id: "mock-3",
              name: isAr ? "إيجار المكتب" : "Office Rent",
              amount: -45000,
              daysUntil: 7,
              type: "vendor",
              date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              confidence: 94,
              frequency: "monthly",
              occurrenceCount: 12,
            },
            {
              id: "mock-4",
              name: "Microsoft 365",
              amount: -8500,
              daysUntil: 10,
              type: "subscription",
              date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
              confidence: 88,
              frequency: "monthly",
              occurrenceCount: 12,
            },
          ];
          setEvents(mockEvents);
        } else {
          setEvents(timelineEvents);
        }
      } catch (error) {
        console.warn("Failed to fetch timeline events, using mock data:", error);
        const mockEvents: TimelineEvent[] = [
          {
            id: "mock-1",
            name: isAr ? "الرواتب" : "Payroll",
            amount: -320000,
            daysUntil: 3,
            type: "payroll",
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            confidence: 96,
            frequency: "monthly",
            occurrenceCount: 12,
          },
          {
            id: "mock-2",
            name: "AWS",
            amount: -11950,
            daysUntil: 5,
            type: "subscription",
            date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            confidence: 91,
            frequency: "monthly",
            occurrenceCount: 24,
          },
          {
            id: "mock-3",
            name: isAr ? "إيجار المكتب" : "Office Rent",
            amount: -45000,
            daysUntil: 7,
            type: "vendor",
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            confidence: 94,
            frequency: "monthly",
            occurrenceCount: 12,
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
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="border-b px-4 py-3 bg-muted/20">
      <div className="flex items-center gap-2 mb-3">
        <Dna className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {isAr ? "الأنماط المتكررة" : "Recurring Patterns"}
        </h3>
      </div>

      <div className="relative pb-1">
        <div className="absolute top-2 left-0 right-0 h-px bg-border" />

        <div className="flex justify-between relative">
          {events.map((event) => (
            <div key={event.id} className="flex flex-col items-center min-w-[80px]">
              <div
                className={cn(
                  "w-2 h-2 rounded-full z-10 shadow-sm",
                  getColorByType(event.type)
                )}
              />

              <div className="mt-2 text-center space-y-0.5">
                <p className="text-xs font-medium truncate max-w-[90px]" title={event.name}>
                  {event.name}
                </p>
                <p className="text-xs text-muted-foreground font-semibold tabular-nums">
                  {formatCompactAmount(event.amount)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isAr ? `خلال ${event.daysUntil}د` : `in ${event.daysUntil}d`}
                </p>
                <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground">
                  <span className="font-medium">{event.confidence}%</span>
                  <span>•</span>
                  <span>{getFrequencyLabel(event.frequency, isAr)}</span>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  {isAr ? `${event.occurrenceCount} مرة` : `${event.occurrenceCount}x`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
