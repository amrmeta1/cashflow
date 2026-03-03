"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function FinalCtaSection() {
  const { locale, t } = useI18n();
  const isAr = locale === "ar";

  return (
    <section className="py-20 md:py-28 bg-landing-darker border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-extrabold tracking-tight text-white"
        >
          {t.marketing.landing.finalCta.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="text-zinc-400 mt-4 text-lg"
        >
          {t.marketing.landing.finalCta.description}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/demo"
            className={cn(
              "inline-flex items-center gap-2 h-12 px-8 rounded-lg font-semibold text-base",
              "bg-neon text-landing-darker hover:bg-neon/90 hover:shadow-[0_0_32px_rgba(0,255,170,0.35)] transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-landing-darker"
            )}
            aria-label={isAr ? "اطلب عرضًا توضيحيًا" : "Request a demo"}
          >
            {t.marketing.landing.finalCta.requestDemo}
            <ArrowRight className={cn("h-4 w-4", isAr && "rotate-180")} aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-12 px-8 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-all text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-landing-darker"
            aria-label={isAr ? "ابدأ مجانًا" : "Start free trial"}
          >
            {t.marketing.landing.finalCta.startFree}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
