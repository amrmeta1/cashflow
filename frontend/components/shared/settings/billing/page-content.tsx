"use client";

import { CreditCard, Check, ExternalLink, TrendingUp, Users, Link2, Zap } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";
import { Progress } from "@/components/shared/ui/progress";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { useBilling } from "./hooks";
import { PLANS } from "./mock-api";
import type { InvoiceStatus, UsageMeter } from "./types";

const ICON_MAP = { bank: TrendingUp, users: Users, link: Link2, zap: Zap } as const;

const INVOICE_STATUS: Record<InvoiceStatus, { labelEn: string; labelAr: string; cls: string }> = {
  paid:    { labelEn: "Paid",    labelAr: "مدفوع", cls: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  pending: { labelEn: "Pending", labelAr: "معلق",  cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  failed:  { labelEn: "Failed",  labelAr: "فشل",   cls: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
};

function UsageMeterRow({ meter, isAr }: { meter: UsageMeter; isAr: boolean }) {
  const Icon = ICON_MAP[meter.icon_key];
  const pct = Math.round((meter.used / meter.limit) * 100);
  const isWarn = pct >= 70;
  const isDanger = pct >= 90;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {isAr ? meter.label_ar : meter.label_en}
        </div>
        <span className="text-xs tabular-nums font-medium">
          {meter.used.toLocaleString()} / {meter.limit.toLocaleString()}
          <span className="text-muted-foreground ms-1">({pct}%)</span>
        </span>
      </div>
      <Progress
        value={pct}
        className={cn(
          "h-1.5",
          isDanger && "[&>div]:bg-red-500",
          isWarn && !isDanger && "[&>div]:bg-amber-500"
        )}
      />
    </div>
  );
}

interface BillingPageContentProps {
  tenantId?: string;
  isAr: boolean;
  locale: string;
}

export function BillingPageContent({ tenantId, isAr, locale }: BillingPageContentProps) {
  const { data: billing, isLoading } = useBilling(tenantId);

  const currentPlan = PLANS.find((p) => p.id === billing?.current_plan);

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      {/* ── Current plan + usage ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Plan card */}
        <div className="md:col-span-1 rounded-md border bg-card p-5 flex flex-col gap-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{isAr ? "الخطة الحالية" : "Current plan"}</p>
                  <p className="text-lg font-bold mt-0.5">
                    {isAr ? currentPlan?.name_ar : currentPlan?.name_en}
                  </p>
                </div>
                <Badge className="text-xs">{isAr ? "نشط" : "Active"}</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold tabular">
                  ${currentPlan?.price_usd}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAr ? "يتجدد في" : "Renews"}:{" "}
                  {billing ? formatDate(billing.renewal_date, locale) : "—"}
                </p>
              </div>
              <Button size="sm" className="w-full text-xs mt-auto">
                {isAr ? "ترقية الخطة" : "Upgrade Plan"}
              </Button>
            </>
          )}
        </div>

        {/* Usage meters */}
        <div className="md:col-span-2 rounded-md border bg-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {isAr ? "استخدام الموارد" : "Resource Usage"}
          </p>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {billing?.usage.map((meter) => (
                <UsageMeterRow key={meter.key} meter={meter} isAr={isAr} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Plan comparison ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {isAr ? "مقارنة الخطط" : "Plan Comparison"}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === billing?.current_plan;
            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-md border p-4 flex flex-col gap-3",
                  isCurrent && "border-primary ring-1 ring-primary/20 bg-primary/5"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{isAr ? plan.name_ar : plan.name_en}</p>
                    {isCurrent && <Badge className="text-xs">{isAr ? "حالي" : "Current"}</Badge>}
                  </div>
                  <p className="text-lg font-bold tabular">
                    {plan.price_usd ? `$${plan.price_usd}` : (isAr ? "تواصل معنا" : "Contact us")}
                    {plan.price_usd && (
                      <span className="text-xs font-normal text-muted-foreground">/mo</span>
                    )}
                  </p>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {(isAr ? plan.features_ar : plan.features_en).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button
                    size="sm"
                    variant={plan.id === "enterprise" ? "outline" : "default"}
                    className="w-full text-xs"
                  >
                    {plan.id === "enterprise"
                      ? (isAr ? "تواصل معنا" : "Contact Sales")
                      : (isAr ? "ترقية" : "Upgrade")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Invoice history ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {isAr ? "سجل الفواتير" : "Invoice History"}
        </p>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 border-b">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">{isAr ? "الوصف" : "Description"}</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground w-28">{isAr ? "التاريخ" : "Date"}</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground w-20">{isAr ? "المبلغ" : "Amount"}</th>
                <th className="px-4 py-2.5 text-start font-medium text-muted-foreground w-24">{isAr ? "الحالة" : "Status"}</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-2">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                : billing?.invoices.map((inv) => {
                    const stat = INVOICE_STATUS[inv.status];
                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium">
                          {isAr ? inv.description_ar : inv.description_en}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground tabular">
                          {formatDate(inv.date, locale)}
                        </td>
                        <td className="px-4 py-2.5 font-semibold tabular">${inv.amount_usd}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", stat.cls)}>
                            {isAr ? stat.labelAr : stat.labelEn}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
