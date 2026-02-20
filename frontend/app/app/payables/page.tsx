"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, CheckCircle2, DollarSign, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { usePayables, Payable, BatchGroup } from "@/lib/hooks/usePayables";
import { PayableCard } from "@/components/payables/PayableCard";

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_UNPAID = 245_000;

const GROUP_META: Record<
  BatchGroup,
  { emoji: string; label_en: string; label_ar: string; borderColor: string }
> = {
  early_pay: {
    emoji: "🔥",
    label_en: "Strategic Early Pay (Yields 2% Discount)",
    label_ar: "دفع مبكر استراتيجي (يحقق خصم ٢٪)",
    borderColor: "border-emerald-500/30",
  },
  standard: {
    emoji: "⚡",
    label_en: "Standard Batch (Just-in-Time)",
    label_ar: "دفعة قياسية (في الوقت المناسب)",
    borderColor: "border-amber-500/30",
  },
  smart_delay: {
    emoji: "🛡️",
    label_en: "Smart Delay (Maximize Cash Retention)",
    label_ar: "تأجيل ذكي (تعظيم الاحتفاظ بالسيولة)",
    borderColor: "border-violet-500/30",
  },
};

const GROUP_ORDER: BatchGroup[] = ["early_pay", "standard", "smart_delay"];

function fmtAmount(n: number): string {
  return `SAR ${n.toLocaleString("en-US")}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GroupHeader({ group, isAr }: { group: BatchGroup; isAr: boolean }) {
  const meta = GROUP_META[group];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-center gap-2 px-4 py-2.5 border-b-2 ${meta.borderColor} bg-muted/30`}
    >
      <span className="text-base">{meta.emoji}</span>
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {isAr ? meta.label_ar : meta.label_en}
      </span>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PayablesPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";

  const {
    payables,
    status,
    optimizationResult,
    terminalLine,
    runOptimization,
  } = usePayables();

  // Sort chaotic view by due date ascending
  const chaoticList = [...payables].sort(
    (a, b) =>
      new Date(a.originalDueDate).getTime() -
      new Date(b.originalDueDate).getTime()
  );

  // Group optimized payables
  const grouped = GROUP_ORDER.reduce<Record<BatchGroup, Payable[]>>(
    (acc, g) => {
      acc[g] = payables.filter((p) => p.batchGroup === g);
      return acc;
    },
    { early_pay: [], standard: [], smart_delay: [] }
  );

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-3xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── Page title ── */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isAr ? "إدارة المدفوعات الذكية" : "AI Smart Payable Batching"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "يُعيد مستشار AI ترتيب فواتيرك لتعظيم رأس المال العامل."
              : "Mustashar AI re-organizes your bills to maximize working capital."}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ACTION HEADER — 3 states
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">

          {/* ── CHAOTIC ── */}
          {status === "chaotic" && (
            <motion.div
              key="chaotic-header"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-0.5">
                  {isAr ? "إجمالي الفواتير غير المدفوعة" : "Total Unpaid Bills"}
                </p>
                <p className="text-2xl font-bold tabular-nums tracking-tighter">
                  {fmtAmount(TOTAL_UNPAID)}
                </p>
              </div>
              <div className="ms-auto">
                <Button
                  size="lg"
                  className="gap-2 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_32px_-4px_hsl(var(--primary)/0.7)] transition-shadow"
                  onClick={runOptimization}
                >
                  <Sparkles className="h-4 w-4" />
                  {isAr ? "✨ تشغيل تحسين رأس المال بالذكاء الاصطناعي" : "✨ Run AI Capital Optimization"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── OPTIMIZING ── */}
          {status === "optimizing" && (
            <motion.div
              key="optimizing-header"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                <motion.p
                  key={terminalLine}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm font-mono text-muted-foreground truncate"
                >
                  {terminalLine}
                </motion.p>
              </div>
              <div className="ms-auto">
                <Button size="lg" disabled className="gap-2 opacity-50">
                  <Sparkles className="h-4 w-4" />
                  {isAr ? "جارٍ التحليل…" : "Analyzing…"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── OPTIMIZED ── */}
          {status === "optimized" && optimizationResult && (
            <motion.div
              key="optimized-header"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-4"
            >
              <div className="flex flex-wrap items-start gap-4">
                {/* Metrics */}
                <div className="flex flex-wrap gap-6 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-500">
                        {isAr ? "سيولة محتفظ بها (تأجيل ١٤ يومًا)" : "Cash Preserved (Delayed 14 days)"}
                      </p>
                      <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400 tracking-tighter">
                        {fmtAmount(optimizationResult.cashPreserved)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-500">
                        {isAr ? "خصومات محققة" : "Discounts Captured"}
                      </p>
                      <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400 tracking-tighter">
                        {fmtAmount(optimizationResult.discountsCaptured)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Approve button */}
                <Button
                  size="sm"
                  className="ms-auto gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isAr ? "اعتماد دفعات الذكاء الاصطناعي" : "Approve AI Payment Batches"}
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            PAYABLE LIST — layout-animated cards
        ══════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-border overflow-hidden">

          <AnimatePresence>
            {status !== "optimized" ? (
              /* ── Chaotic / Optimizing: single flat list ── */
              <motion.div key="flat-list" layout>
                {chaoticList.map((p) => (
                  <PayableCard
                    key={p.id}
                    payable={p}
                    isAr={isAr}
                    isOptimized={false}
                  />
                ))}
              </motion.div>
            ) : (
              /* ── Optimized: grouped sections ── */
              <motion.div key="grouped-list" layout>
                {GROUP_ORDER.filter((g) => grouped[g].length > 0).map((g) => (
                  <div key={g}>
                    <GroupHeader group={g} isAr={isAr} />
                    {grouped[g].map((p) => (
                      <PayableCard
                        key={p.id}
                        payable={p}
                        isAr={isAr}
                        isOptimized
                      />
                    ))}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}
