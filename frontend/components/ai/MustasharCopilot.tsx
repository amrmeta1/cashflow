"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// ── Message types ──────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "ai" | "user";
  text: string;
}

// ── Response generator ─────────────────────────────────────────────────────────

function generateResponse(input: string, isAr: boolean, currency: string): string {
  const lower = input.toLowerCase();
  const trim = input.trim();

  // تأجيل دفعة الموردين / postpone supplier payment
  if (/تأجيل|تأخير|دفعة|موردين|supplier|postpone|delay.*payment/.test(lower) || /دفعة الموردين/.test(trim)) {
    return isAr
      ? `بناءً على وضعك النقدي الحالي: الرصيد المتاح 198,300 ${currency} والالتزامات القادمة خلال ١٤ يوماً تُقدّر بـ 85,000 ${currency}. تأجيل دفعة الموردين (مثلاً ٣٠ يوم) ممكن من الناحية السيولة، مع مراعاة علاقتك بالمورد — أنصح بالتنسيق معه على موعد جديد وتوثيق ذلك. إن كان العقد يسمح بفترة سماح فاستخدمها؛ وإلا تفاوض على تمديد قصير مع تجنّب التأثير على التوريد.`
      : `Given your current cash position (available 198,300 ${currency}, commitments over 14 days ~85,000 ${currency}), postponing the supplier payment (e.g. by 30 days) is feasible from a liquidity standpoint. Coordinate with the supplier and document the new due date; if the contract allows a grace period, use it—otherwise negotiate a short extension while avoiding supply disruption.`;
  }

  // تأثير قبول العقد الجديد / new contract impact
  if (/تأثير|قبول|العقد الجديد|عقد جديد|contract|impact/.test(lower) || /قبول العقد/.test(trim)) {
    return isAr
      ? `قبول العقد الجديد سيزيد الإيرادات المتوقعة، لكنه يرفع أيضاً متطلبات رأس المال العامل والالتزامات خلال ٩٠ يوماً. حسب محاكاة سريعة: صافي التدفق خلال الربع الأول إيجابي بحدود 40,000 ${currency} إضافية بعد احتساب التكاليف. أنصح بمراجعة شروط الدفع مع العميل (مثلاً ٣٠ يوم بدل ٦٠) لتحسين التوقيت النقدي، وربط التنفيذ بجدولة المدفوعات للموردين حتى لا يحدث ضغط سيولة.`
      : `Accepting the new contract would increase expected revenue but also working capital needs and commitments over 90 days. A quick simulation shows net cash flow in Q1 positive by ~40,000 ${currency} after costs. I recommend reviewing payment terms with the client (e.g. 30 days instead of 60) to improve cash timing, and aligning execution with supplier payment schedules to avoid liquidity pressure.`;
  }

  // تحليل المصاريف / analyze expenses
  if (/مصاريف|expense|تحليل المصاريف|analyze.*expense/.test(lower)) {
    return isAr
      ? `تحليل المصاريف الأخيرة يوضح أن أكبر ثلاث بنود: المرتبات والإيجاد (٤٢٪)، الموردون والخدمات (٣٥٪)، والعمليات (٢٣٪). مقارنةً بالشهر الماضي هناك ارتفاع طفيف في فئة الموردين بنسبة ٥٪ — يعود جزء منه لفواتير مؤجلة من الربع السابق. أنصح بمراجعة الاشتراكات والصفقات المتكررة؛ توجد فرصة توفير تقدّر بحوالي 4,500 ${currency} شهرياً دون التأثير على التشغيل.`
      : `Recent expense analysis shows the top three categories: payroll & rent (42%), suppliers & services (35%), and operations (23%). Versus last month there’s a 5% rise in suppliers, partly from deferred invoices. I recommend reviewing subscriptions and recurring deals; there’s an estimated 4,500 ${currency}/month saving without affecting operations.`;
  }

  // محاكاة انخفاض الإيرادات / revenue drop simulation
  if (/محاكاة|انخفاض|إيرادات|revenue|simulate|drop/.test(lower)) {
    return isAr
      ? `محاكاة انخفاض الإيرادات ٢٠٪: صافي التدفق النقدي الشهري ينخفض من حوالي 52,000 ${currency} إلى 18,000 ${currency}، مع بقاء الرصيد فوق حد الأمان 50,000 ${currency} حتى نهاية الربع الثاني. إن استمر الانخفاض لأكثر من ربعين أنصح بتفعيل خطة تقليل التكاليف الثابتة (مثلاً ١٠٪) والتفاوض على تأجيل مدفوعات غير حرجة.`
      : `Simulating a 20% revenue drop: monthly net cash flow falls from ~52,000 ${currency} to ~18,000 ${currency}, with balance staying above the 50,000 ${currency} safety level through Q2. If the drop persists beyond two quarters, I recommend activating a plan to trim fixed costs (e.g. 10%) and negotiating delays on non-critical payments.`;
  }

  if (/pay|دفع|فاتورة|invoice/.test(lower)) {
    return isAr
      ? `قمت بتحليل الفواتير المعلقة. لديك ٣ فواتير بإجمالي 78,500 ${currency} تستحق خلال ٧ أيام. أنصح بترتيب الأولويات حسب شروط الخصم — يمكنك توفير 2,340 ${currency} بالدفع المبكر للفاتورة رقم INV-2024-087.`
      : `I've analyzed your pending invoices. You have 3 invoices totaling ${currency} 78,500 due within 7 days. I recommend prioritizing by discount terms — you can save ${currency} 2,340 by paying invoice INV-2024-087 early.`;
  }

  if (/forecast|توقع|predict/.test(lower)) {
    return isAr
      ? `بناءً على بيانات آخر ٦ أشهر، أتوقع تدفقاً نقدياً إيجابياً بقيمة 125,000 ${currency} الشهر القادم. ومع ذلك، هناك احتمال ٣٠٪ لانخفاض الإيرادات إذا تأخرت الدفعة من العميل "الفا للمقاولات". هل تريد رؤية سيناريوهات بديلة؟`
      : `Based on the last 6 months of data, I forecast a positive cash flow of ${currency} 125,000 next month. However, there's a 30% chance of a revenue dip if the payment from "Alpha Contracting" is delayed. Want me to show alternative scenarios?`;
  }

  if (/risk|مخاطر|خطر/.test(lower)) {
    return isAr
      ? `تقييم المخاطر: المستوى العام متوسط. أكبر خطر هو تركّز ٤٥٪ من الإيرادات على عميل واحد. أيضاً، نسبة السيولة السريعة ١٫٢ — قريبة من الحد الأدنى. أنصح بتنويع قاعدة العملاء وإنشاء احتياطي نقدي يغطي ٦٠ يوماً.`
      : `Risk assessment: Overall level is moderate. The biggest risk is 45% revenue concentration on a single client. Also, your quick ratio is 1.2x — close to the minimum threshold. I recommend diversifying the client base and building a cash reserve covering 60 days.`;
  }

  if (/save|وفر|تكلفة|cost/.test(lower)) {
    return isAr
      ? `وجدت ٣ فرص لتقليل التكاليف: (١) إعادة التفاوض على عقد الإنترنت يوفر 1,200 ${currency}/شهر، (٢) التبديل للفوترة الإلكترونية يوفر 800 ${currency}/شهر، (٣) توحيد اشتراكات البرمجيات يوفر 2,500 ${currency}/شهر. الإجمالي: 4,500 ${currency} شهرياً.`
      : `I found 3 cost reduction opportunities: (1) Renegotiating the internet contract saves ${currency} 1,200/mo, (2) Switching to e-invoicing saves ${currency} 800/mo, (3) Consolidating software subscriptions saves ${currency} 2,500/mo. Total: ${currency} 4,500 monthly.`;
  }

  if (/transfer|تحويل/.test(lower)) {
    return isAr
      ? `لتنفيذ تحويل آمن، تأكد من أن الرصيد المتاح يتجاوز المبلغ المطلوب + هامش أمان ١٠٪. حالياً رصيدك يسمح بتحويل حتى 180,000 ${currency}. هل تريدني أن أجهز أمر التحويل؟`
      : `To execute a safe transfer, ensure available balance exceeds the required amount + 10% safety margin. Your current balance allows transfers up to ${currency} 180,000. Want me to prepare the transfer order?`;
  }

  if (/balance|رصيد/.test(lower)) {
    return isAr
      ? `رصيدك الحالي: 245,800 ${currency}. الرصيد المتاح بعد خصم الالتزامات المعلقة: 198,300 ${currency}. المتوقع خلال ٧ أيام: +52,000 ${currency} واردات و -31,000 ${currency} مدفوعات. صافي الوضع النقدي صحي.`
      : `Current balance: ${currency} 245,800. Available balance after pending obligations: ${currency} 198,300. Expected in 7 days: +${currency} 52,000 inflows and -${currency} 31,000 outflows. Net cash position is healthy.`;
  }

  return isAr
    ? "يمكنني مساعدتك في: تحليل الفواتير، توقعات التدفق النقدي، تقييم المخاطر، تحسين التكاليف، التحويلات المالية، والاستعلام عن الأرصدة. كيف يمكنني خدمتك؟"
    : "I can help you with: invoice analysis, cash flow forecasting, risk assessment, cost optimization, fund transfers, and balance inquiries. What would you like to know?";
}

// ── Suggestion chips ───────────────────────────────────────────────────────────

function getSuggestions(isAr: boolean) {
  return [
    { key: "balance", label: isAr ? "تحقق من رصيدي" : "Check my balance" },
    { key: "payments", label: isAr ? "المدفوعات القادمة" : "Upcoming payments" },
    { key: "risk", label: isAr ? "ملخص المخاطر" : "Risk summary" },
  ];
}

// ── Typing indicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] rounded-2xl px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-tr-sm">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ── Copilot component ──────────────────────────────────────────────────────────

let nextId = 2;

const initialMessages = (isAr: boolean, companyName: string, currency: string): Message[] => [
  {
    id: "1",
    role: "ai",
    text: isAr
      ? `أهلاً بك في ${companyName}. رصيدك اليوم آمن، ولكن لاحظت فاتورة بقيمة 45,000 ${currency} تستحق غداً. كيف يمكنني مساعدتك؟`
      : `Welcome to ${companyName}. Your balance today is safe, but I noticed an invoice of ${currency} 45,000 due tomorrow. How can I help?`,
  },
];

export function MustasharCopilot() {
  const { profile } = useCompany();
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const currency = profile.currency || "SAR";
  const companyName = profile.companyName || (isAr ? "شركتك" : "your company");
  const pendingPromptRef = useRef<string | null>(null);

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      const prompt = customEvent.detail?.prompt;
      setOpen(true);
      if (prompt?.trim()) {
        pendingPromptRef.current = prompt.trim();
      }
    };
    window.addEventListener("open-mustashar-copilot", handler);
    return () => window.removeEventListener("open-mustashar-copilot", handler);
  }, []);

  const [messages, setMessages] = useState<Message[]>(() => initialMessages(isAr, companyName, currency));

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const userMsg: Message = { id: String(nextId++), role: "user", text: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsTyping(true);

      setTimeout(() => {
        const aiMsg: Message = {
          id: String(nextId++),
          role: "ai",
          text: generateResponse(trimmed, isAr, currency),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
      }, 800);
    },
    [isAr, currency, isTyping],
  );

  // When opened with a pre-filled prompt (from command palette), auto-send after a short delay
  useEffect(() => {
    if (!open || !pendingPromptRef.current) return;
    const prompt = pendingPromptRef.current;
    pendingPromptRef.current = null;
    const timer = setTimeout(() => sendMessage(prompt), 400);
    return () => clearTimeout(timer);
  }, [open, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const suggestions = getSuggestions(isAr);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="mustashar-chat"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-20 left-6 z-50 w-[350px] h-[500px] flex flex-col"
            dir={isAr ? "rtl" : "ltr"}
          >
            <Card className="flex flex-col h-full shadow-2xl border-border/60 overflow-hidden">
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b bg-card shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 shrink-0">
                  <Bot className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">
                    {isAr ? "الوكيل مُستشار" : "Mustashar Agent"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">(Decision Agent)</p>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium ms-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isAr ? "متصل" : "Online"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>

            {/* Messages */}
            <CardContent ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-start" : "justify-end",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                      msg.role === "ai"
                        ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100 rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm",
                    )}
                    suppressHydrationWarning
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && <TypingIndicator />}
            </CardContent>

            {/* Suggestions */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-t bg-card/50 shrink-0 overflow-x-auto">
              {suggestions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className="shrink-0 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 px-2.5 py-1 text-[10px] font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors"
                  onClick={() => sendMessage(s.label)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Input footer */}
            <div className="flex items-center gap-2 px-4 py-3 border-t bg-card shrink-0">
              <Input
                placeholder={isAr ? "اكتب رسالتك..." : "Type your message..."}
                className="h-8 text-xs flex-1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isTyping}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
