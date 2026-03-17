"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const EASING = [0.16, 1, 0.3, 1] as const;

const createFadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: EASING, delay },
});

const KPI_METRICS = [
  { id: 'balance', labelEn: 'Balance', labelAr: 'الرصيد', value: 'SAR 287K', color: 'text-neon' },
  { id: 'flow', labelEn: 'Flow', labelAr: 'التدفق', value: '+42K', color: 'text-neon' },
  { id: 'runway', labelEn: 'Runway', labelAr: 'المدة', value: '14 mo', color: 'text-gold' },
] as const;

const CHART_DATA_MOCK = [40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 88, 95] as const;

export function HeroSection() {
  const { locale, t } = useI18n();
  const isAr = locale === "ar";

  const fadeUpVariants = useMemo(() => ({
    badge: createFadeUp(0),
    heading: createFadeUp(0.08),
    description: createFadeUp(0.16),
    ctas: createFadeUp(0.24),
  }), []);

  return (
    <section className="relative min-h-[90vh] flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 px-4 md:px-6 lg:px-8 pt-20 pb-16 overflow-hidden bg-landing-darker">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 start-0 w-[500px] h-[500px] rounded-full bg-neon/10 blur-[120px] opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 end-0 w-[400px] h-[400px] rounded-full bg-neon/5 blur-[100px] opacity-50"
      />

      {/* Left: Copy + CTAs */}
      <header className="relative z-10 max-w-2xl flex flex-col items-start text-start">
        <motion.span
          {...fadeUpVariants.badge}
          className="inline-flex items-center gap-2 rounded-full border border-neon/30 bg-neon/10 px-4 py-1.5 text-xs font-medium text-neon mb-6"
          role="status"
          aria-label={isAr ? "شارة المنتج" : "Product badge"}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t.marketing.landing.heroBadge}
        </motion.span>

        <motion.h1
          {...fadeUpVariants.heading}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white"
        >
          {t.marketing.landing.heroTitle}
        </motion.h1>

        <motion.p
          {...fadeUpVariants.description}
          className="text-lg md:text-xl text-zinc-400 mt-6 leading-relaxed max-w-xl"
        >
          {t.marketing.landing.heroDescription}
        </motion.p>

        <motion.div
          {...fadeUpVariants.ctas}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-10"
        >
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-neon text-landing-darker font-semibold text-base hover:bg-neon/90 hover:shadow-[0_0_32px_rgba(0,255,170,0.35)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-landing-darker"
            aria-label={isAr ? "اطلب عرضًا توضيحيًا للمنتج" : "Request a product demo"}
          >
            {t.marketing.landing.requestDemoBtn}
            <ArrowRight className={cn("h-4 w-4", isAr && "rotate-180")} aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-12 px-8 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-all text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-landing-darker"
            aria-label={isAr ? "ابدأ تجربة مجانية" : "Start free trial"}
          >
            {t.marketing.landing.startFreeBtn}
          </Link>
        </motion.div>
      </header>

      {/* Right: Dashboard preview with neon charts */}
      <motion.div
        initial={{ opacity: 0, x: isAr ? -40 : 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: EASING, delay: 0.2 }}
        className="relative z-10 w-full max-w-2xl lg:max-w-none lg:w-[55%] aspect-[16/10] rounded-2xl border border-white/10 bg-landing-dark/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-neon/10"
        role="img"
        aria-label={isAr ? "معاينة لوحة التحكم" : "Dashboard preview"}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-neon/80" />
          <span className="ms-3 text-[10px] text-zinc-500 font-mono">app.TadFuq.ai/dashboard</span>
        </div>

        <div className="p-5 flex flex-col gap-4 h-full">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3" role="list" aria-label={isAr ? "مؤشرات الأداء الرئيسية" : "Key performance indicators"}>
            {KPI_METRICS.map((metric) => (
              <div key={metric.id} className="rounded-xl border border-white/10 bg-white/5 p-3" role="listitem">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {isAr ? metric.labelAr : metric.labelEn}
                </p>
                <p className={cn("text-lg font-bold tabular-nums", metric.color)}>{metric.value}</p>
              </div>
            ))}
          </div>

          {/* Neon chart mock */}
          <div 
            className="flex-1 min-h-[120px] rounded-xl border border-neon/20 bg-neon/5 flex items-end gap-1 p-3"
            role="img"
            aria-label={isAr ? "رسم بياني لتطور التدفق النقدي" : "Cash flow evolution chart"}
          >
            {CHART_DATA_MOCK.map((h, i) => (
              <div
                key={`chart-bar-${i}`}
                className="flex-1 rounded-t bg-neon/80 min-h-[4px]"
                style={{ height: `${h}%` }}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Mini table */}
          <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden" role="region" aria-label={isAr ? "آخر المعاملات" : "Recent transactions"}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-[10px] font-semibold text-zinc-300">
                {isAr ? "آخر المعاملات" : "Recent transactions"}
              </span>
              <span className="text-[10px] text-neon">AI · 98%</span>
            </div>
            <div className="flex gap-4 px-3 py-2 text-[10px]">
              <span className="text-zinc-500">STC Pay</span>
              <span className="text-rose-400">-1,250</span>
              <span className="text-zinc-500">Kahramaa</span>
              <span className="text-rose-400">-3,740</span>
              <span className="text-neon">+180,000</span>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 pointer-events-none" />
      </motion.div>
    </section>
  );
}
