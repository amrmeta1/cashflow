"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";

const STATS = [
  { value: "98.6%", labelEn: "AI accuracy", labelAr: "دقة AI" },
  { value: "14", labelEn: "months runway", labelAr: "أشهر مدة" },
  { value: "500+", labelEn: "GCC waitlist", labelAr: "قائمة الانتظار" },
  { value: "3", labelEn: "AI agents", labelAr: "وكلاء AI" },
];

export function StatsSection() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <section id="solutions" className="py-20 md:py-28 bg-landing-cream text-landing-darker">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.value}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-center md:text-start"
            >
              <p className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-neon">
                {stat.value}
              </p>
              <p className="mt-2 text-sm md:text-base text-zinc-700 font-medium">
                {isAr ? stat.labelAr : stat.labelEn}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
