"use client";

import { Eye, Clock, CheckCircle2, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn, formatCurrency } from "@/lib/utils";
import { SEVERITY_CONFIG, STATUS_CONFIG, relativeTime } from "./columns";
import { useAlertAction } from "./hooks";
import type { Alert } from "./types";

interface AlertSheetProps {
  alert: Alert | null;
  onClose: () => void;
  tenantId?: string;
  isAr: boolean;
  locale: string;
  dir: "ltr" | "rtl";
}

const RECOMMENDED_ACTIONS_EN = [
  "Review related transactions in the ledger",
  "Contact the finance team lead",
  "Update the 13-week cash flow forecast",
];
const RECOMMENDED_ACTIONS_AR = [
  "مراجعة المعاملات المرتبطة في دفتر الأستاذ",
  "التواصل مع قائد الفريق المالي",
  "تحديث توقعات التدفق النقدي لـ١٣ أسبوعًا",
];

export function AlertSheet({
  alert,
  onClose,
  tenantId,
  isAr,
  locale,
  dir,
}: AlertSheetProps) {
  const { mutate: doAction, isPending } = useAlertAction(tenantId);

  const sheetSide = dir === "rtl" ? "left" : "right";

  return (
    <Sheet open={!!alert} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={sheetSide as "left" | "right"}
        className="w-full max-w-lg flex flex-col p-0 gap-0"
        dir={dir}
      >
        {alert && (() => {
          const sev = SEVERITY_CONFIG[alert.severity];
          const SevIcon = sev.icon;
          const stat = STATUS_CONFIG[alert.status];

          return (
            <>
              {/* ── Header ── */}
              <SheetHeader className="px-6 py-4 border-b shrink-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium",
                      sev.badge
                    )}
                  >
                    <SevIcon className="h-3 w-3" />
                    {isAr ? sev.labelAr : sev.labelEn}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                      stat.badge
                    )}
                  >
                    {isAr ? stat.labelAr : stat.labelEn}
                  </span>
                  <span className="ms-auto text-xs text-muted-foreground tabular">
                    {relativeTime(alert.created_at, isAr)}
                  </span>
                </div>
                <SheetTitle className="text-base leading-snug text-start">
                  {isAr ? alert.title_ar : alert.title_en}
                </SheetTitle>
                <SheetDescription className="text-start">
                  {isAr ? alert.description_ar : alert.description_en}
                </SheetDescription>
              </SheetHeader>

              {/* ── Body ── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Why */}
                <section>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {isAr ? "لماذا حدث هذا؟" : "Why this alert?"}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {isAr ? alert.why_ar : alert.why_en}
                  </p>
                </section>

                {/* Related amount */}
                {alert.related_amount != null && (
                  <section className="rounded-md border bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      {isAr ? "المبلغ المرتبط" : "Related amount"}
                    </p>
                    <p className="text-lg font-semibold tabular-nums outflow">
                      {formatCurrency(alert.related_amount, "SAR", locale)}
                    </p>
                  </section>
                )}

                {/* Recommended actions */}
                <section>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {isAr ? "الإجراءات الموصى بها" : "Recommended actions"}
                  </p>
                  <ul className="space-y-2">
                    {(isAr ? RECOMMENDED_ACTIONS_AR : RECOMMENDED_ACTIONS_EN).map(
                      (action, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {action}
                        </li>
                      )
                    )}
                  </ul>
                </section>
              </div>

              {/* ── Footer actions ── */}
              <div className="border-t px-6 py-4 flex gap-2 shrink-0">
                {alert.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs gap-1.5"
                    disabled={isPending}
                    onClick={() =>
                      doAction({ id: alert.id, action: "acknowledge" })
                    }
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {isAr ? "اعتراف" : "Acknowledge"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs gap-1.5"
                  disabled={isPending}
                  onClick={() =>
                    doAction({ id: alert.id, action: "snooze" })
                  }
                >
                  <Clock className="h-3.5 w-3.5" />
                  {isAr ? "تأجيل ٢٤ ساعة" : "Snooze 24h"}
                </Button>
                {alert.status !== "resolved" && (
                  <Button
                    size="sm"
                    className="flex-1 text-xs gap-1.5"
                    disabled={isPending}
                    onClick={() =>
                      doAction({ id: alert.id, action: "resolve" })
                    }
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isAr ? "حل" : "Resolve"}
                  </Button>
                )}
              </div>
            </>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
}
