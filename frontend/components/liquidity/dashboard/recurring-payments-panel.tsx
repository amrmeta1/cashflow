"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Timer, Calendar, TrendingUp } from "lucide-react";
import { Badge } from "@/components/shared/ui/badge";
import { cn } from "@/lib/utils";
import { getCashFlowPatterns } from "@/lib/api/cashflow-dna-api";
import type { CashFlowPattern } from "@/lib/api/cashflow-dna-api";
import { Skeleton } from "@/components/shared/ui/skeleton";

interface RecurringPaymentsPanelProps {
  tenantId?: string;
  currency: string;
  isAr: boolean;
}

function formatFrequency(frequency: string, isAr: boolean): string {
  const map: Record<string, { en: string; ar: string }> = {
    daily: { en: "Daily", ar: "يومي" },
    weekly: { en: "Weekly", ar: "أسبوعي" },
    biweekly: { en: "Bi-weekly", ar: "نصف شهري" },
    monthly: { en: "Monthly", ar: "شهري" },
    quarterly: { en: "Quarterly", ar: "ربع سنوي" },
  };
  return isAr ? map[frequency]?.ar || frequency : map[frequency]?.en || frequency;
}

function formatDate(dateStr: string | undefined, isAr: boolean): string {
  if (!dateStr) return isAr ? "غير محدد" : "N/A";
  
  try {
    const date = new Date(dateStr);
    const month = date.toLocaleString(isAr ? "ar-SA" : "en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  } catch {
    return isAr ? "غير محدد" : "N/A";
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (confidence >= 60) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
}

export function RecurringPaymentsPanel({ tenantId, currency, isAr }: RecurringPaymentsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<CashFlowPattern[]>([]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchPatterns = async () => {
      try {
        const data = await getCashFlowPatterns(tenantId, 60);
        const filtered = (data.patterns || []).filter(
          (p) =>
            p.pattern_type === "recurring_vendor" ||
            p.pattern_type === "payroll" ||
            p.pattern_type === "subscription"
        );
        setPatterns(filtered);
      } catch (error) {
        console.warn("Failed to fetch recurring patterns:", error);
        setPatterns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPatterns();
  }, [tenantId]);

  if (loading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border/50 px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-3 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (patterns.length === 0) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              {isAr ? "المدفوعات المتكررة" : "Recurring Payments"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="text-sm text-muted-foreground">
            {isAr ? "لا توجد أنماط مكتشفة بعد" : "No patterns detected yet"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">
            {isAr ? "المدفوعات المتكررة" : "Recurring Payments"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-3">
        {patterns.slice(0, 5).map((pattern) => (
          <div
            key={pattern.id}
            className="flex items-start gap-3 rounded-lg border border-border/50 px-3 py-2.5 hover:border-border/80 transition-colors"
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                pattern.pattern_type === "payroll"
                  ? "bg-indigo-100 dark:bg-indigo-900/40"
                  : pattern.pattern_type === "subscription"
                  ? "bg-emerald-100 dark:bg-emerald-900/40"
                  : "bg-amber-100 dark:bg-amber-900/40"
              )}
            >
              {pattern.pattern_type === "payroll" ? (
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              ) : (
                <Calendar className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium truncate">
                  {pattern.vendor_name ||
                    (pattern.pattern_type === "payroll"
                      ? isAr
                        ? "الرواتب"
                        : "Payroll"
                      : isAr
                      ? "غير معروف"
                      : "Unknown")}
                </p>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {formatFrequency(pattern.frequency, isAr)}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {isAr ? "متوسط:" : "Avg:"} {currency} {Math.abs(pattern.avg_amount).toLocaleString()}
                </p>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", getConfidenceColor(pattern.confidence))}>
                  {Math.round(pattern.confidence)}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {isAr ? "التالي:" : "Next:"} {formatDate(pattern.next_expected, isAr)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
