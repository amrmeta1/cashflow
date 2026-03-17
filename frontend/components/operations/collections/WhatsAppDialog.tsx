"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/ui/dialog";
import { Button } from "@/components/shared/ui/button";
import { MessageCircle, CheckCheck } from "lucide-react";
import type { Receivable } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildWhatsAppMessage(receivable: Receivable, isAr: boolean, fmt: (n: number) => string): string {
  const amount = fmt(receivable.amount);
  const days = receivable.daysOverdue;
  const ref = receivable.invoiceRef;

  if (isAr) {
    return `مرحباً عزيزي،\n\nنتمنى أن تكونوا بخير. 🌟\n\nنود تذكيركم بلطف بوجود فاتورة مستحقة بقيمة *${amount}* منذ *${days} يوماً* (مرجع: ${ref}).\n\nنرفق لكم رابط الدفع السريع لتجنب إيقاف الخدمات. يسعدنا تسهيل الأمر بأي طريقة دفع تناسبكم.\n\nشكراً لتعاونكم الكريم. 🙏`;
  }

  return `Hello,\n\nWe hope you're doing well. 🌟\n\nThis is a gentle reminder that invoice *${ref}* for *${amount}* has been outstanding for *${days} days*.\n\nWe've attached a quick payment link to help resolve this at your earliest convenience.\n\nThank you for your continued partnership. 🙏`;
}

function buildWhatsAppUrl(receivable: Receivable, isAr: boolean, fmt: (n: number) => string): string {
  const msg = buildWhatsAppMessage(receivable, isAr, fmt);
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface WhatsAppDialogProps {
  receivable: Receivable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAr: boolean;
  fmt: (n: number) => string;
}

export function WhatsAppDialog({
  receivable,
  open,
  onOpenChange,
  isAr,
  fmt,
}: WhatsAppDialogProps) {
  if (!receivable) return null;

  const message = buildWhatsAppMessage(receivable, isAr, fmt);
  const waUrl = buildWhatsAppUrl(receivable, isAr, fmt);
  const clientName = isAr ? receivable.clientAr : receivable.client;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4 text-emerald-500" />
            {isAr
              ? `مسودة واتساب AI — ${clientName}`
              : `AI WhatsApp Drafter — ${clientName}`}
          </DialogTitle>
        </DialogHeader>

        {/* Invoice meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <span>{receivable.invoiceRef}</span>
          <span className="tabular-nums font-semibold text-foreground">
            {fmt(receivable.amount)}
          </span>
          {receivable.daysOverdue > 0 && (
            <span className="text-destructive font-medium">
              {isAr
                ? `متأخرة ${receivable.daysOverdue} يوم`
                : `${receivable.daysOverdue}d overdue`}
            </span>
          )}
        </div>

        {/* WhatsApp bubble mock */}
        <div
          className="flex flex-col items-end px-2 py-3 rounded-xl"
          style={{ background: "#ECE5DD" }}
          dir="auto"
        >
          {/* Header bar mimicking WhatsApp */}
          <div
            className="w-full flex items-center gap-2 px-3 py-2 rounded-t-xl mb-2"
            style={{ background: "#075E54" }}
          >
            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold leading-none">
                {clientName}
              </p>
              <p className="text-white/60 text-[10px] mt-0.5">
                {isAr ? "واتساب" : "WhatsApp"}
              </p>
            </div>
          </div>

          {/* Message bubble */}
          <div
            className="relative max-w-[85%] ms-auto rounded-xl rounded-tr-none p-3.5 shadow-sm"
            style={{ background: "#E7FFDB" }}
            dir={isAr ? "rtl" : "ltr"}
          >
            <p className="text-[13px] text-black leading-relaxed whitespace-pre-line">
              {message}
            </p>
            {/* Timestamp + double tick */}
            <div className="flex items-center justify-end gap-1 mt-1.5">
              <span className="text-[10px] text-black/40">
                {new Date().toLocaleTimeString(isAr ? "ar-SA" : "en-SA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <CheckCheck className="h-3.5 w-3.5 text-[#53BDEB]" />
            </div>
          </div>

          {/* AI badge */}
          <p className="text-[10px] text-black/40 mt-1.5 pe-1">
            {isAr ? "✨ صِيغت بواسطة مستشار AI" : "✨ Drafted by Mustashar AI"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            asChild
            className="w-full gap-2 text-white font-semibold"
            style={{ background: "#25D366" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#128C7E")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#25D366")
            }
          >
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              {isAr ? "إرسال عبر واتساب ويب" : "Send via WhatsApp Web"}
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            {isAr ? "إغلاق" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
