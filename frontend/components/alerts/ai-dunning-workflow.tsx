"use client";

import { useEffect, useState } from "react";
import { Sparkles, MessageCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { Textarea } from "@/components/shared/ui/textarea";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

export interface DunningMetadata {
  clientName: string;
  amount: number;
  currency: string;
  daysOverdue: number;
  phone: string;
  invoiceRef: string;
}

type WorkflowStatus = "idle" | "generating" | "review";
type Tone = "friendly" | "formal" | "firm";

interface AIDunningWorkflowProps {
  metadata: DunningMetadata;
  isAr: boolean;
  locale: string;
}

// ── Message templates ────────────────────────────────────────────────────────

function buildMessage(tone: Tone, meta: DunningMetadata, isAr: boolean): string {
  const { clientName, amount, currency, daysOverdue, invoiceRef } = meta;
  const formattedAmount = amount.toLocaleString("en-US");

  if (isAr) {
    switch (tone) {
      case "friendly":
        return `مرحباً فريق ${clientName}،\n\nنأمل أن تكونوا بخير. نود تذكيركم بلطف بأن الفاتورة ${invoiceRef} بقيمة ${formattedAmount} ${currency} قد استحقت منذ ${daysOverdue} يوماً.\n\nنقدر تعاملكم معنا ونأمل تسوية هذا المبلغ في أقرب وقت ممكن. لا تترددوا في التواصل معنا إذا كان لديكم أي استفسار.\n\nشكراً لكم،\nالفريق المالي`;
      case "formal":
        return `السادة ${clientName} المحترمون،\n\nتحية طيبة وبعد،\n\nنود إحاطتكم علماً بأن الفاتورة رقم ${invoiceRef} بقيمة ${formattedAmount} ${currency} لا تزال غير مسددة منذ ${daysOverdue} يوماً من تاريخ استحقاقها.\n\nنرجو التكرم بمراجعة هذا الأمر واتخاذ الإجراءات اللازمة للسداد في أقرب وقت ممكن.\n\nمع التقدير،\nالإدارة المالية`;
      case "firm":
        return `عناية الإدارة المالية في ${clientName}،\n\nإشعار أخير بخصوص الفاتورة ${invoiceRef} المتأخرة لأكثر من ${daysOverdue} يوماً بمبلغ ${formattedAmount} ${currency}.\n\nنرجو السداد الفوري خلال ٤٨ ساعة لتجنب تعليق الخدمات واتخاذ الإجراءات القانونية اللازمة.\n\nالإدارة المالية`;
    }
  } else {
    switch (tone) {
      case "friendly":
        return `Hi ${clientName} team,\n\nHope you're doing well! We wanted to send a friendly reminder that invoice ${invoiceRef} for ${currency} ${formattedAmount} is now ${daysOverdue} days past due.\n\nWe truly value our partnership and would appreciate your attention to this at your earliest convenience. Please don't hesitate to reach out if you have any questions.\n\nWarm regards,\nFinance Team`;
      case "formal":
        return `Dear ${clientName},\n\nThis is a formal notice that invoice ${invoiceRef} in the amount of ${currency} ${formattedAmount} remains outstanding and is ${daysOverdue} days past its due date.\n\nWe kindly request that you review this matter and arrange for payment at your earliest convenience.\n\nSincerely,\nFinance Department`;
      case "firm":
        return `Attention: Finance Department, ${clientName}\n\nFinal notice regarding invoice ${invoiceRef} which is now more than ${daysOverdue} days overdue. Outstanding balance: ${currency} ${formattedAmount}.\n\nImmediate payment is required within 48 hours to avoid service suspension and further action.\n\nFinance Management`;
    }
  }
}

// ── Tone button ──────────────────────────────────────────────────────────────

const TONE_CONFIG: Record<Tone, { labelEn: string; labelAr: string }> = {
  friendly: { labelEn: "Friendly",  labelAr: "ودي"    },
  formal:   { labelEn: "Formal",    labelAr: "رسمي"   },
  firm:     { labelEn: "Firm",      labelAr: "حازم"   },
};

// ── Component ────────────────────────────────────────────────────────────────

export function AIDunningWorkflow({ metadata, isAr, locale }: AIDunningWorkflowProps) {
  const [status, setStatus]       = useState<WorkflowStatus>("idle");
  const [tone, setTone]           = useState<Tone>("friendly");
  const [messageText, setMessage] = useState("");

  // Simulate AI generation with 1500ms latency
  const generate = (nextTone: Tone) => {
    setTone(nextTone);
    setStatus("generating");
    setTimeout(() => {
      setMessage(buildMessage(nextTone, metadata, isAr));
      setStatus("review");
    }, 1500);
  };

  const handleToneChange = (nextTone: Tone) => {
    if (nextTone === tone && status === "review") return;
    generate(nextTone);
  };

  const handleSend = () => {
    const url = `https://wa.me/${metadata.phone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, "_blank");
  };

  const handleReset = () => {
    setStatus("idle");
    setTone("friendly");
    setMessage("");
  };

  // ── Idle state ─────────────────────────────────────────────────────────────
  if (status === "idle") {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-primary">
            {isAr ? "إجراء مستشار AI" : "Mustashar AI Action"}
          </span>
        </div>

        {/* Prompt */}
        <p className="text-sm text-foreground leading-relaxed">
          {isAr
            ? `هذه الفاتورة متأخرة ${metadata.daysOverdue} يومًا. هل تريد صياغة رسالة واتساب مناسبة ثقافيًا لتذكير العميل؟`
            : `This invoice is ${metadata.daysOverdue} days late. Draft a culturally-appropriate B2B WhatsApp reminder?`}
        </p>

        {/* Client summary */}
        <div className="rounded-md bg-background/60 border px-3 py-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isAr ? "العميل" : "Client"}</span>
            <span className="font-medium">{metadata.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isAr ? "الفاتورة" : "Invoice"}</span>
            <span className="font-medium tabular-nums">{metadata.invoiceRef}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isAr ? "المبلغ" : "Amount"}</span>
            <span className="font-semibold tabular-nums outflow">
              {metadata.amount.toLocaleString("en-US")} {metadata.currency}
            </span>
          </div>
        </div>

        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5"
          onClick={() => generate("friendly")}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isAr ? "صياغة رسالة" : "Draft Message"}
        </Button>
      </div>
    );
  }

  // ── Generating state ───────────────────────────────────────────────────────
  if (status === "generating") {
    const toneLabel = isAr ? TONE_CONFIG[tone].labelAr : TONE_CONFIG[tone].labelEn;
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0 animate-pulse" />
          <span className="text-xs font-semibold text-primary">
            {isAr ? "إجراء مستشار AI" : "Mustashar AI Action"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground animate-pulse">
          {isAr
            ? `مستشار يصيغ رسالة ${toneLabel} للأعمال...`
            : `Mustashar is crafting a ${toneLabel.toLowerCase()} B2B message...`}
        </p>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[90%]" />
          <Skeleton className="h-3 w-[80%]" />
          <Skeleton className="h-3 w-[95%]" />
          <Skeleton className="h-3 w-[70%]" />
        </div>
      </div>
    );
  }

  // ── Review & Send state ────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-primary">
            {isAr ? "إجراء مستشار AI" : "Mustashar AI Action"}
          </span>
        </div>
        <button
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title={isAr ? "إعادة تعيين" : "Reset"}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tone selector */}
      <div className="flex gap-1 rounded-md border bg-background/60 p-1">
        {(["friendly", "formal", "firm"] as Tone[]).map((t) => (
          <button
            key={t}
            onClick={() => handleToneChange(t)}
            className={cn(
              "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
              tone === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {isAr ? TONE_CONFIG[t].labelAr : TONE_CONFIG[t].labelEn}
          </button>
        ))}
      </div>

      {/* Editable message textarea */}
      <Textarea
        value={messageText}
        onChange={(e) => setMessage(e.target.value)}
        rows={7}
        className="text-xs leading-relaxed resize-none bg-background/80 tabular-nums"
        dir={isAr ? "rtl" : "ltr"}
      />

      {/* Recipient info */}
      <p className="text-[11px] text-muted-foreground">
        {isAr ? "إرسال إلى: " : "Sending to: "}
        <span className="font-medium tabular-nums">+{metadata.phone}</span>
        {" · "}{metadata.clientName}
      </p>

      {/* Send button */}
      <Button
        size="sm"
        className="w-full h-8 text-xs gap-1.5 bg-[#25D366]/90 hover:bg-[#25D366] text-white border-0"
        onClick={handleSend}
        disabled={!messageText.trim()}
      >
        <MessageCircle className="me-1 h-3.5 w-3.5" />
        {isAr ? "إرسال عبر واتساب" : "Send via WhatsApp"}
      </Button>
    </div>
  );
}
