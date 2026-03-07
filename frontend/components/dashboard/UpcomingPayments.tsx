import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, AlertTriangle, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpcomingPayment {
  id: string;
  descEn: string;
  descAr: string;
  amount: number;
  daysUntil: number;
  severity: "danger" | "warning" | "normal";
}

interface UpcomingPaymentsProps {
  payments: UpcomingPayment[];
  currency: string;
  isAr: boolean;
  title: string;
  dueInLabel: string;
  daysLabel: string;
}

export function UpcomingPayments({
  payments,
  currency,
  isAr,
  title,
  dueInLabel,
  daysLabel,
}: UpcomingPaymentsProps) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-3">
        {payments.map((pmt) => (
          <div
            key={pmt.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5",
              pmt.severity === "danger"
                ? "border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/10"
                : pmt.severity === "warning"
                  ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/10"
                  : "border-border/50"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                pmt.severity === "danger"
                  ? "bg-rose-100 dark:bg-rose-900/40"
                  : pmt.severity === "warning"
                    ? "bg-amber-100 dark:bg-amber-900/40"
                    : "bg-muted"
              )}
            >
              {pmt.severity === "danger" ? (
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              ) : pmt.severity === "warning" ? (
                <Clock className="h-4 w-4 text-amber-500" />
              ) : (
                <Calendar className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {isAr ? pmt.descAr : pmt.descEn}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {dueInLabel} {pmt.daysUntil} {daysLabel}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400 shrink-0">
              -{currency} {pmt.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
