"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { Link2, Shield, TrendingUp, Zap, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const PILLARS = [
  {
    id: "connect",
    icon: Link2,
    titleEn: "Connect",
    titleAr: "اتصال",
    taglineEn: "See and act on your liquidity, everywhere",
    taglineAr: "راقب وتصرف في سيولتك، في كل مكان",
    descEn: "Unify banking data, ERP systems, and analytics. Achieve real-time visibility across 200+ GCC banks: every account, entity, and currency.",
    descAr: "وحّد البيانات البنكية وأنظمة ERP والتحليلات. احصل على رؤية فورية عبر 200+ بنك خليجي: كل حساب وكيان وعملة.",
    ctaEn: "Stop waiting for data. Start acting on intelligence.",
    ctaAr: "توقف عن انتظار البيانات. ابدأ بالتصرف بناءً على الذكاء.",
    color: "neon",
    gradient: "from-neon/20 to-neon/5",
  },
  {
    id: "protect",
    icon: Shield,
    titleEn: "Protect",
    titleAr: "حماية",
    taglineEn: "Keep every payment safe, compliant, and traceable",
    taglineAr: "حافظ على كل دفعة آمنة ومتوافقة وقابلة للتتبع",
    descEn: "End-to-end fraud prevention with real-time anomaly detection. Complete ZATCA audit trails. Built-in GCC compliance.",
    descAr: "منع الاحتيال من البداية للنهاية مع كشف الشذوذ الفوري. مسارات تدقيق ZATCA كاملة. امتثال خليجي مدمج.",
    ctaEn: "Block fraud in real time, before payments leave your account.",
    ctaAr: "امنع الاحتيال فوريًا، قبل أن تغادر المدفوعات حسابك.",
    color: "gold",
    gradient: "from-gold/20 to-gold/5",
  },
  {
    id: "forecast",
    icon: TrendingUp,
    titleEn: "Forecast",
    titleAr: "توقع",
    taglineEn: "Plan ahead with AI you can trust",
    taglineAr: "خطط مسبقًا بذكاء اصطناعي موثوق",
    descEn: "AI-powered forecasting that's accurate, explainable, and continuously learning. Model scenarios, stress-test plans, see the future with clarity.",
    descAr: "توقعات مدعومة بالذكاء الاصطناعي دقيقة وقابلة للتفسير ومتعلمة باستمرار. نمذج السيناريوهات، اختبر الخطط، انظر المستقبل بوضوح.",
    ctaEn: "Turn your expertise into foresight.",
    ctaAr: "حوّل خبرتك إلى بصيرة.",
    color: "neon",
    gradient: "from-neon/20 to-neon/5",
  },
  {
    id: "optimize",
    icon: Zap,
    titleEn: "Optimize",
    titleAr: "تحسين",
    taglineEn: "Free up cash and manage risk",
    taglineAr: "حرر النقد وأدر المخاطر",
    descEn: "Free up idle cash, lower financing costs, manage FX risk. Intelligent recommendations tied to your liquidity position and GCC market conditions.",
    descAr: "حرر النقد الخامل، قلل تكاليف التمويل، أدر مخاطر العملات. توصيات ذكية مرتبطة بوضع سيولتك وظروف السوق الخليجي.",
    ctaEn: "Every optimization unlocks more liquidity.",
    ctaAr: "كل تحسين يفتح المزيد من السيولة.",
    color: "gold",
    gradient: "from-gold/20 to-gold/5",
  },
] as const;

export function FourPillarsSection() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null);

  return (
    <section id="vision" className="py-24 md:py-32 bg-landing-darker relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,255,170,0.15) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }} aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-neon/20 bg-neon/5 px-5 py-2 text-sm font-medium text-neon mb-6">
            {isAr ? "رؤيتنا" : "Our Vision"}
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            {isAr ? "أربع ركائز للأداء النقدي" : "Four Pillars of Liquidity Performance"}
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
            {isAr
              ? "على عكس الحلول المجزأة، تقدم تدفق أداءً نقديًا شاملاً من البداية للنهاية."
              : "Unlike fragmented point solutions, Tadfuq delivers end-to-end liquidity performance."}
          </p>
        </motion.div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {PILLARS.map((pillar, index) => {
            const Icon = pillar.icon;
            const isHovered = hoveredPillar === pillar.id;
            
            return (
              <motion.article
                key={pillar.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onMouseEnter={() => setHoveredPillar(pillar.id)}
                onMouseLeave={() => setHoveredPillar(null)}
                className={cn(
                  "group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-8 md:p-10",
                  "transition-all duration-500 hover:border-white/20 hover:shadow-2xl",
                  isHovered && "scale-[1.02]"
                )}
              >
                {/* Gradient overlay on hover */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 transition-opacity duration-500",
                  pillar.gradient,
                  isHovered && "opacity-100"
                )} />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className={cn(
                    "inline-flex items-center justify-center w-16 h-16 rounded-xl mb-6 transition-all duration-300",
                    pillar.color === "neon" ? "bg-neon/10 text-neon" : "bg-gold/10 text-gold",
                    isHovered && "scale-110"
                  )}>
                    <Icon className="w-8 h-8" aria-hidden="true" />
                  </div>

                  {/* Title */}
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {isAr ? pillar.titleAr : pillar.titleEn}
                  </h3>

                  {/* Tagline */}
                  <p className={cn(
                    "text-lg font-semibold mb-4 transition-colors duration-300",
                    pillar.color === "neon" ? "text-neon/80" : "text-gold/80"
                  )}>
                    {isAr ? pillar.taglineAr : pillar.taglineEn}
                  </p>

                  {/* Description */}
                  <p className="text-zinc-300 leading-relaxed mb-6">
                    {isAr ? pillar.descAr : pillar.descEn}
                  </p>

                  {/* CTA text */}
                  <p className={cn(
                    "text-base font-medium transition-colors duration-300",
                    pillar.color === "neon" ? "text-neon" : "text-gold"
                  )}>
                    {isAr ? pillar.ctaAr : pillar.ctaEn}
                  </p>

                  {/* Watch video link */}
                  <button
                    className={cn(
                      "inline-flex items-center gap-2 mt-6 text-sm font-medium transition-all duration-300",
                      "hover:gap-3",
                      pillar.color === "neon" ? "text-neon hover:text-neon/80" : "text-gold hover:text-gold/80"
                    )}
                    aria-label={isAr ? `شاهد فيديو ${pillar.titleAr}` : `Watch ${pillar.titleEn} video`}
                  >
                    <Play className="w-4 h-4" aria-hidden="true" />
                    {isAr ? "شاهد الفيديو" : "Watch the video"}
                  </button>
                </div>

                {/* Decorative corner accent */}
                <div className={cn(
                  "absolute top-0 end-0 w-32 h-32 rounded-bl-full opacity-0 transition-opacity duration-500",
                  pillar.color === "neon" ? "bg-neon/5" : "bg-gold/5",
                  isHovered && "opacity-100"
                )} aria-hidden="true" />
              </motion.article>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-16 pt-16 border-t border-white/10"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {isAr ? "مستقبل الخزينة موجود بالفعل." : "The future of treasury is already here."}
          </h3>
          <p className="text-lg text-zinc-400 max-w-3xl mx-auto mb-8">
            {isAr
              ? "فرق الخزينة تصبح استراتيجيين للسيولة، وليس معالجين للمعاملات. الفائزون ينسقون بذكاء اصطناعي موثوق يراقب على مدار الساعة."
              : "Treasury teams become liquidity strategists, not transaction processors. Winners orchestrate with trusted AI that monitors 24/7."}
          </p>
          <a
            href="/demo"
            className={cn(
              "inline-flex items-center justify-center gap-2 h-14 px-10 rounded-lg font-semibold text-base",
              "bg-neon text-landing-darker hover:bg-neon/90 transition-all duration-300",
              "hover:shadow-[0_0_40px_rgba(0,255,170,0.4)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-landing-darker"
            )}
          >
            {isAr ? "ابنِ هذا المستقبل مع تدفق اليوم" : "Build this future with Tadfuq today"}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
