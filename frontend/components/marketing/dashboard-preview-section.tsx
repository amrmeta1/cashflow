"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function DashboardPreviewSection() {
  const { locale, t } = useI18n();
  const isAr = locale === "ar";

  return (
    <section id="liquidity" className="py-20 md:py-28 bg-landing-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-flex rounded-full border border-neon/30 bg-neon/10 px-4 py-1.5 text-xs font-medium text-neon mb-4">
            {t.marketing.landing.dashboard.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            {t.marketing.landing.dashboard.title}
          </h2>
          <p className="text-zinc-400 mt-4 max-w-2xl mx-auto text-lg">
            {t.marketing.landing.dashboard.description}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl border border-white/10 bg-landing-darker/80 backdrop-blur-sm overflow-hidden aspect-[16/9] max-h-[500px] shadow-2xl shadow-neon/10"
        >
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="w-full h-full rounded-xl border border-neon/20 bg-neon/5 flex flex-col">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-neon/20">
                <BarChart3 className="h-5 w-5 text-neon" />
                <span className="text-sm font-semibold text-white">
                  {t.marketing.landing.dashboard.chartTitle}
                </span>
              </div>
              <div className="flex-1 flex items-end gap-1 p-4">
                {[65, 72, 58, 80, 75, 88, 82, 90, 85, 92, 88, 95, 90].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.04 }}
                    className="flex-1 rounded-t bg-neon/80 min-w-[8px]"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-lg bg-neon/90 text-landing-darker px-5 py-2.5 text-sm font-semibold hover:bg-neon transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-landing-darker"
              aria-label={isAr ? "جرب العرض التوضيحي" : "Try interactive demo"}
            >
              {t.marketing.landing.dashboard.tryDemo}
              <ArrowRight className={cn("h-4 w-4", isAr && "rotate-180")} aria-hidden="true" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
