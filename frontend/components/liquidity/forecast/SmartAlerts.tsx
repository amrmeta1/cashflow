"use client";

import { useMemo } from "react";
import { AlertTriangle, TrendingDown, Calendar, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/shared/ui/alert";
import { cn } from "@/lib/utils";

interface SmartAlertsProps {
  forecastData: Array<{
    month: string;
    balance?: number;
    forecast?: number;
    inflow?: number;
    outflow?: number;
  }>;
  upcomingEvents?: Array<{
    name: string;
    amount: number;
    daysUntil: number;
  }>;
  isAr: boolean;
  formatAmount: (amount: number) => string;
}

interface Alert {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  icon: React.ElementType;
}

export function SmartAlerts({ forecastData, upcomingEvents, isAr, formatAmount }: SmartAlertsProps) {
  const alerts = useMemo(() => {
    const alertList: Alert[] = [];

    if (!forecastData || forecastData.length === 0) {
      return alertList;
    }

    // Calculate average balance to determine thresholds dynamically
    const avgBalance = forecastData
      .slice(0, 3)
      .reduce((sum, m) => sum + (m.forecast || m.balance || 0), 0) / 3;
    
    const lowThreshold = avgBalance * 0.3; // 30% of average
    const criticalThreshold = avgBalance * 0.15; // 15% of average

    // 1. Check for low liquidity (balance below threshold in next 3 months)
    const lowBalanceMonths = forecastData
      .slice(0, 3)
      .filter((m) => (m.forecast || m.balance || 0) < lowThreshold);

    if (lowBalanceMonths.length > 0) {
      const minBalance = Math.min(...lowBalanceMonths.map((m) => m.forecast || m.balance || 0));
      const monthName = lowBalanceMonths[0].month;
      
      alertList.push({
        id: "low-liquidity",
        type: minBalance < criticalThreshold ? "critical" : "warning",
        title: isAr ? "تحذير: سيولة منخفضة" : "Warning: Low Liquidity",
        message: isAr
          ? `الرصيد المتوقع في ${monthName} سيكون ${formatAmount(minBalance)}. يُنصح بتأمين سيولة إضافية.`
          : `Forecast balance in ${monthName} will be ${formatAmount(minBalance)}. Consider securing additional liquidity.`,
        icon: AlertTriangle,
      });
    }

    // 2. Check for negative cash flow trend
    const recentMonths = forecastData.slice(0, 3);
    const negativeMonths = recentMonths.filter(
      (m) => (m.outflow || 0) > (m.inflow || 0)
    );

    if (negativeMonths.length >= 2) {
      const avgBurn = negativeMonths.reduce(
        (sum, m) => sum + ((m.outflow || 0) - (m.inflow || 0)),
        0
      ) / negativeMonths.length;

      alertList.push({
        id: "negative-trend",
        type: "warning",
        title: isAr ? "تحذير: اتجاه سلبي للتدفق النقدي" : "Warning: Negative Cash Flow Trend",
        message: isAr
          ? `متوسط الحرق الشهري ${formatAmount(avgBurn)}. راجع المصروفات لتحسين التدفق النقدي.`
          : `Average monthly burn is ${formatAmount(avgBurn)}. Review expenses to improve cash flow.`,
        icon: TrendingDown,
      });
    }

    // 3. Check for large upcoming payments (within 7 days)
    if (upcomingEvents && upcomingEvents.length > 0) {
      const paymentThreshold = avgBalance * 0.05; // 5% of average balance
      const urgentPayments = upcomingEvents.filter(
        (e) => e.daysUntil <= 7 && Math.abs(e.amount) > paymentThreshold
      );

      if (urgentPayments.length > 0) {
        const totalAmount = urgentPayments.reduce((sum, e) => sum + Math.abs(e.amount), 0);
        
        alertList.push({
          id: "urgent-payments",
          type: "info",
          title: isAr ? "مدفوعات قادمة خلال 7 أيام" : "Upcoming Payments in 7 Days",
          message: isAr
            ? `${urgentPayments.length} دفعة كبيرة قادمة بإجمالي ${formatAmount(totalAmount)}. تأكد من توفر السيولة.`
            : `${urgentPayments.length} large payment(s) coming up totaling ${formatAmount(totalAmount)}. Ensure liquidity is available.`,
          icon: Calendar,
        });
      }
    }

    // 4. Positive alert if liquidity is healthy (no critical/warning alerts)
    const hasNegativeAlerts = alertList.some(a => a.type === 'critical' || a.type === 'warning');
    
    if (!hasNegativeAlerts && avgBalance > 0) {
      alertList.push({
        id: "healthy-liquidity",
        type: "success",
        title: isAr ? "سيولة صحية" : "Healthy Liquidity",
        message: isAr
          ? `متوسط الرصيد المتوقع ${formatAmount(avgBalance)}. الوضع المالي مستقر.`
          : `Average forecast balance is ${formatAmount(avgBalance)}. Financial position is stable.`,
        icon: CheckCircle2,
      });
    }

    return alertList;
  }, [forecastData, upcomingEvents, isAr, formatAmount]);

  if (alerts.length === 0) {
    return null;
  }

  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "border-red-500/50 bg-red-500/5 text-red-900 dark:text-red-100";
      case "warning":
        return "border-amber-500/50 bg-amber-500/5 text-amber-900 dark:text-amber-100";
      case "info":
        return "border-blue-500/50 bg-blue-500/5 text-blue-900 dark:text-blue-100";
      case "success":
        return "border-emerald-500/50 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100";
      default:
        return "";
    }
  };

  const getIconColor = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "text-red-500";
      case "warning":
        return "text-amber-500";
      case "info":
        return "text-blue-500";
      case "success":
        return "text-emerald-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <Alert
            key={alert.id}
            className={cn("border-l-4", getAlertStyles(alert.type))}
          >
            <Icon className={cn("h-4 w-4", getIconColor(alert.type))} />
            <AlertDescription>
              <p className="font-semibold text-sm mb-1">{alert.title}</p>
              <p className="text-xs opacity-90">{alert.message}</p>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
