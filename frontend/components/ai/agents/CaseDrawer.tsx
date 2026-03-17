"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/shared/ui/sheet";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useI18n } from "@/lib/i18n/context";
import type { AgentCase } from "./ActiveCasesPanel";

const MOCK_TIMELINE = [
  { time: "08:00", timeAr: "٠٨:٠٠", textEn: "Case created", textAr: "تم إنشاء الحالة" },
  { time: "09:15", timeAr: "٠٩:١٥", textEn: "Invoice due date passed", textAr: "انقضاء موعد الفاتورة" },
  { time: "10:30", timeAr: "١٠:٣٠", textEn: "Reminder not sent", textAr: "لم يُرسل تذكير" },
  { time: "Now", timeAr: "الآن", textEn: "Action recommended", textAr: "إجراء موصى به" },
];

interface CaseDrawerProps {
  open: boolean;
  case: AgentCase | null;
  onClose: () => void;
  onSimulate?: () => void;
}

export function CaseDrawer({ open, case: caseData, onClose, onSimulate }: CaseDrawerProps) {
  const { fmt } = useCurrency();
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const side = isAr ? "left" : "right";

  if (!caseData) return null;

  const severityVariant =
    caseData.severity === "High" ? "destructive" : caseData.severity === "Medium" ? "default" : "secondary";
  const severityLabel =
    isAr
      ? (caseData.severity === "High" ? "عالي" : caseData.severity === "Medium" ? "متوسط" : "منخفض")
      : caseData.severity;
  const dueFormatted = new Date(caseData.dueDate).toLocaleDateString(isAr ? "ar-SA" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={side} className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{isAr ? caseData.titleAr : caseData.title}</SheetTitle>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant={severityVariant}>{severityLabel}</Badge>
            <span className="text-sm font-medium tabular-nums" dir="ltr">
              {fmt(caseData.impactAmount)}
            </span>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {isAr ? "الموعد" : "Due date"}
            </p>
            <p className="text-sm" suppressHydrationWarning>{dueFormatted}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {isAr ? "التوصية" : "Recommendation"}
            </p>
            <p className="text-sm">{isAr ? caseData.recommendationAr : caseData.recommendation}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {isAr ? "الجدول الزمني" : "Timeline"}
            </p>
            <div className="relative">
              <div className="absolute top-0 bottom-0 start-[7px] w-px bg-border" />
              <div className="space-y-3">
                {MOCK_TIMELINE.map((ev, i) => (
                  <div key={i} className="relative flex items-start gap-3">
                    <div className="relative z-10 mt-1.5 h-3 w-3 rounded-full bg-indigo-500 border-2 border-background shrink-0" />
                    <div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {isAr ? ev.timeAr : ev.time}
                      </span>
                      <p className="text-sm">{isAr ? ev.textAr : ev.textEn}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <SheetFooter className="flex-row gap-2 sm:justify-start border-t pt-4">
          <Button size="sm" variant="default" onClick={onSimulate}>
            {isAr ? "محاكاة" : "Simulate"}
          </Button>
          <Button size="sm" variant="outline">
            {isAr ? "تعليم كمُحلّة" : "Mark Resolved"}
          </Button>
          <Button size="sm" variant="outline">
            {isAr ? "إرسال تذكير" : "Send Reminder"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
