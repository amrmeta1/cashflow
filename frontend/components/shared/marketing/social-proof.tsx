"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";

// ── Logo data ─────────────────────────────────────────────────────────────────

interface Logo {
  id: string;
  name: string;
  abbr: string;
  color: string;
  tagline_en: string;
  tagline_ar: string;
}

const LOGOS: Logo[] = [
  {
    id: "qnb",
    name: "QNB",
    abbr: "QNB",
    color: "text-violet-400",
    tagline_en: "Qatar National Bank",
    tagline_ar: "بنك قطر الوطني",
  },
  {
    id: "cbq",
    name: "CBQ",
    abbr: "CBQ",
    color: "text-sky-400",
    tagline_en: "Commercial Bank of Qatar",
    tagline_ar: "البنك التجاري القطري",
  },
  {
    id: "masraf",
    name: "Masraf",
    abbr: "MAR",
    color: "text-emerald-400",
    tagline_en: "Masraf Al Rayan",
    tagline_ar: "مصرف الريان",
  },
  {
    id: "sap",
    name: "SAP",
    abbr: "SAP",
    color: "text-amber-400",
    tagline_en: "SAP Partner",
    tagline_ar: "شريك SAP",
  },
  {
    id: "zatca",
    name: "ZATCA",
    abbr: "ZATCA",
    color: "text-rose-400",
    tagline_en: "ZATCA Certified",
    tagline_ar: "معتمد من الزكاة والضريبة",
  },
];

// ── Logo pill ─────────────────────────────────────────────────────────────────

function LogoPill({ logo, isAr, delay }: { logo: Logo; isAr: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
      className={[
        "flex flex-col items-center gap-1.5 px-6 py-4 rounded-2xl",
        "border border-white/8 bg-white/[0.03]",
        "hover:bg-white/[0.06] hover:border-white/15",
        "transition-all duration-300 cursor-default group min-w-[110px]",
      ].join(" ")}
    >
      {/* Monogram wordmark */}
      <span className={`text-xl font-extrabold tracking-tight tabular-nums ${logo.color} group-hover:opacity-100 opacity-70 transition-opacity duration-300`}>
        {logo.abbr}
      </span>
      <span className="text-[10px] text-zinc-600 text-center leading-tight">
        {isAr ? logo.tagline_ar : logo.tagline_en}
      </span>
    </motion.div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SocialProof() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <section className="relative mt-24 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-xs text-zinc-600 uppercase tracking-widest mb-8"
        >
          {isAr
            ? "موثوق به من قِبَل البنوك والجهات التنظيمية في المنطقة"
            : "Trusted by regional banks, regulators & technology partners"}
        </motion.p>

        {/* Logo grid */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {LOGOS.map((logo, i) => (
            <LogoPill key={logo.id} logo={logo} isAr={isAr} delay={i * 0.08} />
          ))}
        </div>

        {/* Security badges */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-2 mt-8"
        >
          {[
            { label_en: "SOC 2 Type II Ready", label_ar: "SOC 2 Type II جاهز" },
            { label_en: "256-bit AES Encryption", label_ar: "تشفير AES 256 بت" },
            { label_en: "ISO 27001 Aligned", label_ar: "متوافق مع ISO 27001" },
            { label_en: "GDPR Compliant", label_ar: "متوافق مع GDPR" },
          ].map((badge) => (
            <span
              key={badge.label_en}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] text-zinc-500"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              {isAr ? badge.label_ar : badge.label_en}
            </span>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
