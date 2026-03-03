"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATS = [
  { value: "40%", label: "reduction in idle cash", labelAr: "تقليل في النقد الخامل" },
  { value: ">$2M", label: "in fraud avoidance", labelAr: "في منع الاحتيال" },
  { value: "85%", label: "overall risk reduction", labelAr: "تقليل المخاطر الإجمالي" },
] as const;

export function KyribaMainHero() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <section className="relative min-h-[75vh] flex items-center justify-center px-4 md:px-6 lg:px-8 pt-28 pb-16 overflow-hidden bg-gradient-to-b from-landing-darker to-landing-dark">
      {/* Subtle background pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,229,160,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Overline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-sm md:text-base text-neon font-semibold uppercase tracking-wider mb-6"
        >
          {isAr ? "نظرة المدير المالي لعام 2026" : "The CFO Outlook for 2026"}
        </motion.p>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-white mb-8"
        >
          {isAr ? (
            <>
              <span className="block">منصة واحدة،</span>
              <span className="block mt-2">أداء سيولة لا محدود</span>
            </>
          ) : (
            <>
              <span className="block">One platform,</span>
              <span className="block mt-2">limitless Liquidity Performance</span>
            </>
          )}
        </motion.h1>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-12 mb-12"
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-neon mb-2">
                {stat.value}
              </div>
              <div className="text-sm md:text-base text-zinc-400">
                {isAr ? stat.labelAr : stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <Link
            href="/demo"
            className={cn(
              "group inline-flex items-center justify-center gap-2 h-14 px-10 rounded-lg font-semibold text-base",
              "bg-neon text-landing-darker hover:bg-neon/90 transition-all duration-300",
              "hover:shadow-[0_0_40px_rgba(0,229,160,0.4)] hover:scale-[1.02]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-landing-darker"
            )}
          >
            {isAr ? "احصل على عرض توضيحي" : "Get a Demo"}
            <ArrowRight className={cn("h-5 w-5 transition-transform group-hover:translate-x-1", isAr && "rotate-180 group-hover:-translate-x-1")} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
