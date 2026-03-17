"use client";

import { motion } from "framer-motion";
import {
  Wand2, Shield, MessageCircle, FileText,
  SlidersHorizontal, TrendingUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Card {
  id: string;
  colSpan: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  glowColor: string;
  title_en: string;
  title_ar: string;
  desc_en: string;
  desc_ar: string;
  decoration: React.ReactNode;
}

// ── Decorations ───────────────────────────────────────────────────────────────

const ImportDecoration = () => (
  <div className="mt-5 rounded-xl bg-zinc-900/80 border border-white/5 p-3 font-mono text-[10px] space-y-1.5">
    <div className="flex items-center gap-2 text-zinc-500">
      <span className="text-amber-400">›</span> Parsing bank_statement_jan.csv…
    </div>
    <div className="flex items-center gap-2 text-zinc-400">
      <span className="text-violet-400">›</span> Mapping 47 transactions to GCC chart of accounts…
    </div>
    <div className="flex items-center gap-2 text-emerald-400">
      <span>✓</span> Done — 98.6% accuracy · 0 manual corrections needed
    </div>
  </div>
);

const VatDecoration = () => (
  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400 font-medium">
    <Shield className="h-3.5 w-3.5" />
    SAR 18,500 ring-fenced &amp; locked
  </div>
);

const WhatsAppDecoration = () => (
  <div className="mt-5 rounded-2xl rounded-ss-none bg-zinc-800/80 border border-white/5 px-3 py-2 text-[11px] text-zinc-300 max-w-[200px] leading-relaxed">
    Hi Khalid, friendly reminder: Invoice #INV-041 of SAR 48,200 is due tomorrow. Reply to confirm. 🤝
    <div className="text-[9px] text-zinc-600 mt-1 text-end">Mustashar AI · 09:14</div>
  </div>
);

const ReportsDecoration = () => (
  <div className="mt-5 flex items-center gap-2">
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] text-sky-400 font-medium">
      <FileText className="h-3 w-3" /> One-click PDF export
    </span>
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-zinc-400 font-medium">
      Board-ready
    </span>
  </div>
);

const SandboxDecoration = () => (
  <div className="mt-5 space-y-2">
    {[
      { label: "Revenue drop", pct: 30, color: "bg-amber-500" },
      { label: "Collection delay", pct: 55, color: "bg-rose-500" },
    ].map((s) => (
      <div key={s.label} className="flex items-center gap-3">
        <span className="text-[10px] text-zinc-500 w-28 shrink-0">{s.label}</span>
        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
        </div>
        <span className="text-[10px] text-zinc-400 tabular-nums w-8 text-end">{s.pct}%</span>
      </div>
    ))}
  </div>
);

const RunwayDecoration = () => (
  <div className="mt-5">
    <div className="text-4xl font-extrabold tabular-nums tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">
      14
    </div>
    <div className="text-xs text-zinc-500 mt-0.5">months projected runway</div>
  </div>
);

// ── Card data ─────────────────────────────────────────────────────────────────

const CARDS: Card[] = [
  {
    id: "import",
    colSpan: "md:col-span-2",
    icon: Wand2,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10",
    glowColor: "bg-violet-500",
    title_en: "Zero-Touch Import",
    title_ar: "استيراد بدون لمس",
    desc_en: "Drop a messy CSV. Get a clean ledger in seconds mapped to GCC standards.",
    desc_ar: "أفلت ملف CSV فوضويًا. احصل على دفتر أستاذ نظيف في ثوانٍ مرسوم وفق معايير الخليج.",
    decoration: <ImportDecoration />,
  },
  {
    id: "vat",
    colSpan: "md:col-span-1",
    icon: Shield,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    glowColor: "bg-emerald-500",
    title_en: "Smart VAT Isolation",
    title_ar: "عزل ضريبة القيمة المضافة",
    desc_en: "Never spend tax money by mistake. Auto-calculated liabilities, locked away.",
    desc_ar: "لا تنفق أموال الضريبة بالخطأ مجددًا. التزامات محسوبة تلقائيًا ومجمدة.",
    decoration: <VatDecoration />,
  },
  {
    id: "whatsapp",
    colSpan: "md:col-span-1",
    icon: MessageCircle,
    iconColor: "text-green-400",
    iconBg: "bg-green-500/10",
    glowColor: "bg-green-500",
    title_en: "AI WhatsApp Collections",
    title_ar: "تحصيل عبر واتساب بالذكاء الاصطناعي",
    desc_en: "Let Mustashar draft and send polite payment reminders instantly via WhatsApp.",
    desc_ar: "دع مستشار يصيغ ويرسل تذكيرات دفع مهذبة فورًا عبر واتساب.",
    decoration: <WhatsAppDecoration />,
  },
  {
    id: "reports",
    colSpan: "md:col-span-2",
    icon: FileText,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10",
    glowColor: "bg-sky-500",
    title_en: "One-Click Board Reports",
    title_ar: "تقارير مجلس الإدارة بنقرة واحدة",
    desc_en: "Generate a print-perfect A4 board report with AI narrative, KPIs, and cash flow charts.",
    desc_ar: "أنشئ تقرير مجلس إدارة A4 جاهزًا للطباعة مع سرد AI ومؤشرات الأداء وتدفقات نقدية.",
    decoration: <ReportsDecoration />,
  },
  {
    id: "sandbox",
    colSpan: "md:col-span-1",
    icon: SlidersHorizontal,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
    glowColor: "bg-amber-500",
    title_en: "What-If Sandbox",
    title_ar: "بيئة تجريبية تفاعلية",
    desc_en: "Slide the dials to simulate revenue drops or delayed payments in real-time.",
    desc_ar: "حرك الأشرطة لمحاكاة انخفاض الإيرادات أو تأخر المدفوعات في الوقت الفعلي.",
    decoration: <SandboxDecoration />,
  },
  {
    id: "runway",
    colSpan: "md:col-span-1",
    icon: TrendingUp,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10",
    glowColor: "bg-rose-500",
    title_en: "Runway Forecast",
    title_ar: "توقع المدة التشغيلية",
    desc_en: "Know exactly how many months of runway you have at your current burn rate.",
    desc_ar: "اعرف بالضبط عدد أشهر التشغيل المتبقية بمعدل إنفاقك الحالي.",
    decoration: <RunwayDecoration />,
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function FeaturesGrid() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <section id="features" className="mt-32 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Pill label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center mb-6"
        >
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 backdrop-blur-md">
            ✦ {isAr ? "كل ما تحتاجه" : "Everything you need"}
          </span>
        </motion.div>

        {/* Section title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="text-3xl md:text-5xl font-extrabold tracking-tighter text-center text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400"
        >
          {isAr ? "مصمم لشركات الشرق الأوسط" : "Built for Middle East Businesses"}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
          className="text-zinc-400 text-center mt-4 max-w-xl mx-auto leading-relaxed"
        >
          {isAr
            ? "كل ميزة مصممة خصيصًا لمتطلبات الامتثال والعمليات في منطقة الخليج."
            : "Every feature purpose-built for GCC compliance requirements and operational realities."}
        </motion.p>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
                className={[
                  card.colSpan,
                  "relative overflow-hidden rounded-3xl",
                  "border border-white/10 hover:border-white/20",
                  "bg-white/5 hover:bg-white/[0.07]",
                  "p-8 transition-all duration-300 group",
                ].join(" ")}
              >
                {/* Per-card radial glow on hover */}
                <div
                  className={[
                    "pointer-events-none absolute -top-10 -start-10",
                    "h-32 w-32 rounded-full blur-2xl",
                    card.glowColor,
                    "opacity-0 group-hover:opacity-25 transition-opacity duration-500",
                  ].join(" ")}
                />

                {/* Inner gradient shimmer */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.04] to-transparent" />

                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg} mb-4`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>

                <h3 className="text-base font-semibold text-white mb-1.5">
                  {isAr ? card.title_ar : card.title_en}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {isAr ? card.desc_ar : card.desc_en}
                </p>

                {card.decoration}
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
