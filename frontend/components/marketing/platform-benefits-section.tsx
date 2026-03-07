"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import {
  Shield,
  Brain,
  GitMerge,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { PlatformBenefitCard } from "./platform-benefit-card";

const CARDS: {
  id: string;
  icon: LucideIcon;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  glow: string;
}[] = [
  {
    id: "agents",
    icon: Brain,
    titleEn: "Agentic AI: Raqib, Mutawaqi, Mustashar",
    titleAr: "وكلاء AI: رقيب، متوقع، مستشار",
    descEn: "Three AI agents watch, forecast, and advise on your cash—24/7, GCC-aware.",
    descAr: "ثلاثة وكلاء AI يراقبون ويتوقعون وينصحون في سيولتك—على مدار الساعة، واعون بمنطقة الخليج.",
    glow: "shadow-neon/20",
  },
  {
    id: "project",
    icon: TrendingUp,
    titleEn: "Project Cash Flow & Consolidation",
    titleAr: "تدفق نقدي للمشاريع والتوحيد",
    descEn: "Per-project visibility and group consolidation for holding companies.",
    descAr: "رؤية لكل مشروع وتوحيد مجموعة للشركات القابضة.",
    glow: "shadow-gold/20",
  },
  {
    id: "consolidation",
    icon: GitMerge,
    titleEn: "Group Consolidation",
    titleAr: "توحيد المجموعة",
    descEn: "Multi-entity rollups, intercompany netting, and group reporting.",
    descAr: "تجمعات متعددة الكيانات ومقاصة بين الشركات وتقارير المجموعة.",
    glow: "shadow-neon/20",
  },
  {
    id: "compliance",
    icon: Shield,
    titleEn: "GCC Compliance & ZATCA VAT",
    titleAr: "الامتثال الخليجي وضريبة القيمة المضافة",
    descEn: "ZATCA-ready VAT isolation, Zakat calendar, and audit trails.",
    descAr: "عزل ضريبة القيمة المضافة جاهز للزاتكا، تقويم الزكاة، ومسارات التدقيق.",
    glow: "shadow-gold/20",
  },
];

export function PlatformBenefitsSection() {
  const { locale, t } = useI18n();
  const isAr = locale === "ar";

  return (
    <section id="platform" className="py-20 md:py-28 bg-landing-darker overflow-hidden" aria-labelledby="platform-heading">
      <div id="resources" className="scroll-mt-24" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-flex rounded-full border border-neon/30 bg-neon/10 px-4 py-1.5 text-xs font-medium text-neon mb-4">
            {t.marketing.landing.platform.badge}
          </span>
          <h2 id="platform-heading" className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            {t.marketing.landing.platform.title}
          </h2>
          <p className="text-zinc-400 mt-4 max-w-2xl mx-auto text-lg">
            {t.marketing.landing.platform.description}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {CARDS.map((card, i) => (
            <PlatformBenefitCard
              key={card.id}
              id={card.id}
              icon={card.icon}
              titleEn={card.titleEn}
              titleAr={card.titleAr}
              descEn={card.descEn}
              descAr={card.descAr}
              isAr={isAr}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
