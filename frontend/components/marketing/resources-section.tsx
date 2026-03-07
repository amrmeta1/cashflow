"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { FileText, ArrowRight, TrendingUp, Building2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const RESOURCES = [
  {
    id: "cfo-guide",
    icon: TrendingUp,
    type: "Guide",
    typeAr: "دليل",
    titleEn: "From Volatility to Vision: How GCC CFOs Can Lead in Economic Uncertainty",
    titleAr: "من التقلب إلى الرؤية: كيف يقود المدراء الماليون في الخليج خلال عدم اليقين الاقتصادي",
    href: "/resources/cfo-leadership-guide",
  },
  {
    id: "almarai-case",
    icon: Building2,
    type: "Case Study",
    typeAr: "دراسة حالة",
    titleEn: "Almarai Revolutionizes Treasury Processes to Maximize Regional Growth",
    titleAr: "المراعي تُحدث ثورة في عمليات الخزينة لتعظيم النمو الإقليمي",
    href: "/resources/almarai-case-study",
  },
  {
    id: "liquidity-guide",
    icon: BookOpen,
    type: "Ultimate Guide",
    typeAr: "الدليل الشامل",
    titleEn: "Unlock Financial Success: The Ultimate Guide to Liquidity Performance in the GCC",
    titleAr: "افتح النجاح المالي: الدليل الشامل للأداء النقدي في الخليج",
    href: "/resources/liquidity-performance-guide",
  },
] as const;

export function ResourcesSection() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <section className="py-20 md:py-28 bg-landing-dark relative overflow-hidden">
      {/* Subtle background pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,255,170,0.03) 35px, rgba(0,255,170,0.03) 70px)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
            {isAr ? "تعمق في الأداء النقدي" : "A deep dive into Liquidity Performance"}
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            {isAr
              ? "اكتشف كيف تحول الشركات الرائدة في الخليج الخزينة من مركز تكلفة إلى ميزة استراتيجية"
              : "Discover how leading GCC enterprises transform treasury from cost center to strategic advantage"}
          </p>
        </motion.div>

        {/* Resources grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {RESOURCES.map((resource, index) => {
            const Icon = resource.icon;
            
            return (
              <motion.article
                key={resource.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link
                  href={resource.href}
                  className={cn(
                    "group block h-full rounded-xl border border-white/10 bg-white/[0.02] p-8",
                    "transition-all duration-300 hover:border-neon/30 hover:bg-white/[0.04]",
                    "hover:shadow-[0_8px_32px_rgba(0,255,170,0.1)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-landing-dark"
                  )}
                >
                  {/* Icon & Type */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-neon/10 text-neon transition-all duration-300 group-hover:bg-neon/20 group-hover:scale-110">
                      <Icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-neon/80 uppercase tracking-wider">
                      {isAr ? resource.typeAr : resource.type}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-4 leading-tight group-hover:text-neon transition-colors duration-300">
                    {isAr ? resource.titleAr : resource.titleEn}
                  </h3>

                  {/* Read link */}
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 group-hover:text-neon group-hover:gap-3 transition-all duration-300">
                    <span>{isAr ? "اقرأ" : "Read"}</span>
                    <ArrowRight className={cn("w-4 h-4", isAr && "rotate-180")} aria-hidden="true" />
                  </div>
                </Link>
              </motion.article>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-16"
        >
          <Link
            href="/resources"
            className={cn(
              "inline-flex items-center gap-2 text-base font-semibold text-neon hover:text-neon/80 transition-all duration-300 hover:gap-3",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-landing-dark rounded-lg px-4 py-2"
            )}
          >
            {isAr ? "استكشف جميع الموارد" : "Explore all resources"}
            <ArrowRight className={cn("w-5 h-5", isAr && "rotate-180")} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
