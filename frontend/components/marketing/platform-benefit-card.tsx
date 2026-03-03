"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { memo } from "react";

interface PlatformBenefitCardProps {
  id: string;
  icon: LucideIcon;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  isAr: boolean;
  index: number;
}

export const PlatformBenefitCard = memo(function PlatformBenefitCard({
  id,
  icon: Icon,
  titleEn,
  titleAr,
  descEn,
  descAr,
  isAr,
  index,
}: PlatformBenefitCardProps) {
  return (
    <motion.div
      id={id === "agents" ? "agents" : undefined}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={cn(
        "group relative rounded-2xl border border-white/10 bg-white/5 p-8 transition-all duration-300",
        "hover:border-neon/30 hover:bg-white/[0.07] hover:shadow-[0_0_40px_-10px_rgba(0,255,170,0.25)]"
      )}
    >
      <div className="absolute inset-0 rounded-2xl bg-neon/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neon/10 text-neon mb-5">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {isAr ? titleAr : titleEn}
        </h3>
        <p className="text-zinc-400 leading-relaxed">
          {isAr ? descAr : descEn}
        </p>
      </div>
    </motion.div>
  );
});
