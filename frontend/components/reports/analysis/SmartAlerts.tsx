"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { Bell, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/lib/hooks/use-tenant";
import { getSmartAlerts } from "@/lib/api/analysis-enhancements-api";

type AlertSeverity = "critical" | "warning" | "info" | "success";

interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  amount?: number;
  previousAmount?: number;
  currency?: string;
  actionLabel?: string;
  actionLabelAr?: string;
  actionUrl?: string;
}

interface SmartAlertsProps {
  alerts?: Alert[];
  isLoading?: boolean;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: any; color: string; bgColor: string; borderColor: string }> = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800",
  },
  warning: {
    icon: TrendingUp,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  info: {
    icon: Bell,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
};

function formatAmount(amount: number, currency: string, isAr: boolean): string {
  const formatted = new Intl.NumberFormat(isAr ? "ar-QA" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  return `${formatted} ${currency}`;
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function SmartAlerts({ alerts, isLoading }: SmartAlertsProps) {
  const { t, dir } = useI18n();
  const isAr = dir === "rtl";
  const { currentTenant } = useTenant();

  // Fetch real data from API
  const { data: apiAlerts, isLoading: apiLoading } = useQuery({
    queryKey: ["smart-alerts", currentTenant?.id],
    queryFn: () => getSmartAlerts(currentTenant?.id || ""),
    enabled: !!currentTenant?.id && !alerts,
  });

  const loading = isLoading || apiLoading;

  // Mock alerts for demo
  const mockAlerts: Alert[] = [
    {
      id: "1",
      severity: "critical",
      title: "Bank Fees Increased Significantly",
      titleAr: "رسوم بنكية زادت بشكل كبير",
      description: "Bank fees increased by 120% this month",
      descriptionAr: "رسوم بنكية زادت 120% هذا الشهر",
      amount: 990,
      previousAmount: 450,
      currency: "QAR",
      actionLabel: "Review Fees",
      actionLabelAr: "مراجعة الرسوم",
      actionUrl: "/reports/transactions?category=bank_charges",
    },
    {
      id: "2",
      severity: "warning",
      title: "Large Unusual Transaction",
      titleAr: "معاملة كبيرة غير عادية",
      description: "45,000 QAR to Unknown Vendor",
      descriptionAr: "45,000 ريال لمورد غير معروف",
      amount: 45000,
      currency: "QAR",
      actionLabel: "Review",
      actionLabelAr: "مراجعة",
      actionUrl: "/reports/transactions",
    },
    {
      id: "3",
      severity: "success",
      title: "Notable Savings in Contractors",
      titleAr: "توفير ملحوظ في المقاولين",
      description: "Contractor expenses decreased by 28% compared to last month",
      descriptionAr: "مصاريف المقاولين انخفضت 28% مقارنة بالشهر الماضي",
      amount: 38000,
      previousAmount: 52800,
      currency: "QAR",
    },
    {
      id: "4",
      severity: "info",
      title: "New Recurring Payment Detected",
      titleAr: "اكتشاف دفعة متكررة جديدة",
      description: "Monthly subscription of 2,500 QAR detected",
      descriptionAr: "اشتراك شهري بقيمة 2,500 ريال تم اكتشافه",
      amount: 2500,
      currency: "QAR",
      actionLabel: "View Pattern",
      actionLabelAr: "عرض النمط",
      actionUrl: "/liquidity/patterns",
    },
  ];

  const displayAlerts = alerts || mockAlerts;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {isAr ? "تنبيهات ذكية" : "Smart Alerts"}
            </CardTitle>
          </div>
          {displayAlerts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {displayAlerts.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : displayAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">
              {isAr ? "لا توجد تنبيهات حالياً" : "No alerts at the moment"}
            </p>
            <p className="text-xs mt-1">
              {isAr ? "كل شيء يبدو جيداً! 🎉" : "Everything looks good! 🎉"}
            </p>
          </div>
        ) : (
          displayAlerts.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity];
            const AlertIcon = config.icon;
            const percentageChange =
              alert.amount && alert.previousAmount
                ? calculatePercentageChange(alert.amount, alert.previousAmount)
                : null;

            return (
              <div
                key={alert.id}
                className={cn(
                  "border rounded-lg p-4 transition-all hover:shadow-sm",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("flex-shrink-0 mt-0.5", config.color)}>
                    <AlertIcon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold">
                        {isAr ? alert.titleAr : alert.title}
                      </h4>
                      {alert.severity === "critical" && (
                        <Badge variant="destructive" className="text-[10px]">
                          {isAr ? "عاجل" : "URGENT"}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">
                      {isAr ? alert.descriptionAr : alert.description}
                    </p>

                    {alert.amount && (
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {formatAmount(alert.amount, alert.currency || "QAR", isAr)}
                        </Badge>
                        {percentageChange !== null && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              percentageChange > 0 ? "text-red-600" : "text-emerald-600"
                            )}
                          >
                            {percentageChange > 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(percentageChange)}%
                          </Badge>
                        )}
                      </div>
                    )}

                    {alert.previousAmount && alert.amount && (
                      <div className="text-xs text-muted-foreground mb-2">
                        {isAr ? "السابق: " : "Previous: "}
                        {formatAmount(alert.previousAmount, alert.currency || "QAR", isAr)}
                      </div>
                    )}

                    {alert.actionUrl && (
                      <Link href={alert.actionUrl}>
                        <Button size="sm" variant="outline" className="gap-1 mt-2 h-7 text-xs">
                          {isAr ? alert.actionLabelAr : alert.actionLabel}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
