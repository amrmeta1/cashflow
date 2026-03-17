"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Lock, BadgeCheck, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

// ── Trust badges ──────────────────────────────────────────────────────────────

const TRUST_BADGES = [
  { icon: Lock,        label_en: "SOC 2 Ready",         label_ar: "متوافق مع SOC 2"         },
  { icon: BadgeCheck,  label_en: "ZATCA Compliant",      label_ar: "متوافق مع الزكاة والضريبة" },
  { icon: Building2,   label_en: "GCC Bank Certified",   label_ar: "معتمد من بنوك الخليج"     },
];

// ── Component ────────────────────────────────────────────────────────────────

export function LeadCapture() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <section className="relative mt-32 pb-32 px-4 overflow-hidden">

      {/* Background radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[400px] w-[400px] rounded-full bg-primary/15 blur-[100px] opacity-70" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-3xl mx-auto text-center"
      >

        {/* Trust badges row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-2 mb-8"
        >
          {TRUST_BADGES.map((b) => {
            const Icon = b.icon;
            return (
              <span
                key={b.label_en}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400 backdrop-blur-md"
              >
                <Icon className="h-3 w-3 text-zinc-500" />
                {isAr ? b.label_ar : b.label_en}
              </span>
            );
          })}
        </motion.div>

        {/* Headline */}
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 leading-none">
          {isAr
            ? "هل أنت مستعد للحصول على وضوح مالي كامل؟"
            : "Ready to gain total\nfinancial clarity?"}
        </h2>

        {/* Subtext */}
        <p className="text-zinc-400 mt-5 text-lg leading-relaxed">
          {isAr
            ? "انضم إلى أكثر من ٥٠٠ شركة خليجية تنتظر الإطلاق."
            : "Join 500+ GCC businesses already on the waitlist."}
        </p>

        {/* Form / Success */}
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 inline-flex flex-col items-center gap-3"
          >
            <span className="text-4xl">🎉</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {isAr ? "أنت على القائمة! سنتواصل معك قريبًا." : "You're on the list! We'll be in touch soon."}
            </span>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 flex w-full max-w-md mx-auto">
            <div
              className={[
                "flex w-full items-center",
                "border border-zinc-800 bg-zinc-900/80 rounded-full p-1",
                "transition-all duration-300",
                "focus-within:border-primary/50",
                "focus-within:ring-1 focus-within:ring-primary/50",
                "focus-within:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]",
              ].join(" ")}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isAr ? "بريدك الإلكتروني" : "you@company.com"}
                className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none min-w-0"
                dir={isAr ? "rtl" : "ltr"}
              />
              <button
                type="submit"
                className={[
                  "shrink-0 bg-primary text-primary-foreground",
                  "rounded-full px-6 py-2.5 text-sm font-medium",
                  "hover:opacity-90 transition-all",
                  "shadow-[0_0_20px_-5px_hsl(var(--primary)/0.6)]",
                ].join(" ")}
              >
                {isAr ? "انضم للقائمة" : "Join Waitlist"}
              </button>
            </div>
          </form>
        )}

        {/* Fine print */}
        <p className="text-xs text-zinc-600 mt-4 space-x-1">
          {isAr
            ? "لا بريد مزعج · لا بطاقة ائتمانية · إلغاء في أي وقت."
            : "No spam · No credit card required · Cancel anytime."}
        </p>

      </motion.div>
    </section>
  );
}
