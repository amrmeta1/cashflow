"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Testimonial {
  id: string;
  quote_en: string;
  quote_ar: string;
  name_en: string;
  name_ar: string;
  title_en: string;
  title_ar: string;
  company_en: string;
  company_ar: string;
  initials: string;
  avatarColor: string;
  glowColor: string;
  metric_en: string;
  metric_ar: string;
  metricLabel_en: string;
  metricLabel_ar: string;
  metricColor: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const TESTIMONIALS: Testimonial[] = [
  {
    id: "khalid",
    quote_en:
      "We used to spend two full days every month pulling together the board report. Now it takes twenty minutes — and the AI narrative is actually better than what we were writing manually.",
    quote_ar:
      "كنّا نقضي يومين كاملين كل شهر لتجميع تقرير مجلس الإدارة. الآن يستغرق الأمر عشرين دقيقة — والسرد الذي يكتبه الذكاء الاصطناعي أفضل مما كنا نكتبه يدويًا.",
    name_en: "Khalid Al-Mansouri",
    name_ar: "خالد المنصوري",
    title_en: "CFO",
    title_ar: "المدير المالي",
    company_en: "Al Mansouri Group",
    company_ar: "مجموعة المنصوري",
    initials: "KM",
    avatarColor: "from-violet-500 to-purple-700",
    glowColor: "bg-violet-500",
    metric_en: "97%",
    metric_ar: "٩٧٪",
    metricLabel_en: "less time on board reports",
    metricLabel_ar: "توفير في وقت تقارير مجلس الإدارة",
    metricColor: "text-violet-400",
  },
  {
    id: "sara",
    quote_en:
      "The VAT ring-fencing alone was worth switching for. We had a painful experience with a tax shortfall before — that will never happen again with Mustashar watching the numbers.",
    quote_ar:
      "عزل ضريبة القيمة المضافة وحده كان كافيًا للتحويل. مررنا بتجربة مؤلمة مع عجز ضريبي من قبل — هذا لن يتكرر مجددًا مع مستشار الذي يراقب الأرقام.",
    name_en: "Sara Al-Qahtani",
    name_ar: "سارة القحطاني",
    title_en: "Finance Director",
    title_ar: "مديرة المالية",
    company_en: "Riyadh Trading Co.",
    company_ar: "شركة الرياض للتجارة",
    initials: "SQ",
    avatarColor: "from-emerald-500 to-teal-700",
    glowColor: "bg-emerald-500",
    metric_en: "SAR 0",
    metric_ar: "صفر ريال",
    metricLabel_en: "in VAT penalties since onboarding",
    metricLabel_ar: "غرامات ضريبية منذ الاشتراك",
    metricColor: "text-emerald-400",
  },
  {
    id: "omar",
    quote_en:
      "Managing cash across five entities used to be a nightmare of spreadsheets and weekly calls. The group consolidation view in Mustashar gives me a single truth in real time.",
    quote_ar:
      "إدارة السيولة عبر خمس كيانات كانت كابوسًا من جداول البيانات والمكالمات الأسبوعية. عرض التوحيد الجماعي في مستشار يمنحني حقيقة واحدة في الوقت الفعلي.",
    name_en: "Omar Bin Nasser",
    name_ar: "عمر بن ناصر",
    title_en: "Group CEO",
    title_ar: "الرئيس التنفيذي للمجموعة",
    company_en: "Nasser Holding",
    company_ar: "قابضة ناصر",
    initials: "ON",
    avatarColor: "from-sky-500 to-blue-700",
    glowColor: "bg-sky-500",
    metric_en: "5×",
    metric_ar: "٥×",
    metricLabel_en: "faster multi-entity reporting",
    metricLabel_ar: "أسرع في تقارير الكيانات المتعددة",
    metricColor: "text-sky-400",
  },
];

// ── Card ──────────────────────────────────────────────────────────────────────

function TestimonialCard({ t, isAr, delay }: { t: Testimonial; isAr: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay }}
      className={[
        "relative flex flex-col justify-between",
        "rounded-3xl border border-white/10 hover:border-white/20",
        "bg-white/5 hover:bg-white/[0.07]",
        "p-8 transition-all duration-300 group overflow-hidden",
      ].join(" ")}
    >
      {/* Corner glow on hover */}
      <div
        className={[
          "pointer-events-none absolute -top-10 -start-10",
          "h-32 w-32 rounded-full blur-2xl",
          t.glowColor,
          "opacity-0 group-hover:opacity-20 transition-opacity duration-500",
        ].join(" ")}
      />

      {/* Inner shimmer */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.03] to-transparent" />

      {/* Top row: quote icon + metric */}
      <div className="flex items-start justify-between mb-6">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 border border-white/10">
          <Quote className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="text-end">
          <div className={`text-2xl font-extrabold tracking-tighter ${t.metricColor}`}>
            {isAr ? t.metric_ar : t.metric_en}
          </div>
          <div className="text-[10px] text-zinc-600 max-w-[110px] leading-tight">
            {isAr ? t.metricLabel_ar : t.metricLabel_en}
          </div>
        </div>
      </div>

      {/* Quote */}
      <blockquote className="flex-1 text-sm text-zinc-300 leading-relaxed mb-8">
        &ldquo;{isAr ? t.quote_ar : t.quote_en}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${t.avatarColor} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
          {t.initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">
            {isAr ? t.name_ar : t.name_en}
          </div>
          <div className="text-xs text-zinc-500">
            {isAr
              ? `${t.title_ar}، ${t.company_ar}`
              : `${t.title_en}, ${t.company_en}`}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Testimonials() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <section className="relative mt-32 px-4">
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
            ✦ {isAr ? "ماذا يقول عملاؤنا" : "What our customers say"}
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
          {isAr ? "موثوق من المديرين الماليين عبر الخليج" : "Trusted by CFOs Across the Gulf"}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
          className="text-zinc-400 text-center mt-4 max-w-xl mx-auto leading-relaxed"
        >
          {isAr
            ? "فرق مالية حقيقية تحول وقتًا ضائعًا إلى قرارات أذكى."
            : "Real finance teams turning wasted hours into smarter decisions."}
        </motion.p>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.id} t={t} isAr={isAr} delay={i * 0.1} />
          ))}
        </div>

      </div>
    </section>
  );
}
