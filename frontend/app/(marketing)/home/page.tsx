"use client";

import { motion } from "framer-motion";
import { KyribaMainHero } from "@/components/marketing/kyriba-main-hero";
import { CashFlowSection } from "@/components/marketing/cash-flow-section";
import { FinancialAnalysisSection } from "@/components/marketing/financial-analysis-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { ConnectSection } from "@/components/marketing/connect-section";

// Disable static generation
export const dynamic = 'force-dynamic';
import { IntegrationsSection } from "@/components/marketing/integrations-section";
import Link from "next/link";
import { ArrowRight, Zap, Shield, TrendingUp, DollarSign } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <KyribaMainHero />

      {/* Cash Flow Forecasting Section */}
      <CashFlowSection />

      {/* Financial Analysis Section */}
      <FinancialAnalysisSection />

      {/* Connect/Unify Section */}
      <ConnectSection />

      {/* Integrations Section */}
      <IntegrationsSection />

      {/* Stats Section with Stagger */}
      <section className="py-16 px-4 bg-zinc-900">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.2 }
            }
          }}
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
        >
          {[
            { value: "90%", label: "Faster reconciliation" },
            { value: "$2M+", label: "Fraud prevented" },
            { value: "100%", label: "Cash visibility" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <div className="text-5xl font-bold text-neon mb-2">{stat.value}</div>
              <div className="text-zinc-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Section with Hover */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-zinc-900 text-center mb-16"
          >
            Everything you need to manage cash flow
          </motion.h2>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {[
              { icon: Zap, title: "AI Forecasting", desc: "Predict cash flow with 95% accuracy", color: "neon" },
              { icon: Shield, title: "Fraud Detection", desc: "Real-time alerts", color: "blue-500" },
              { icon: TrendingUp, title: "Smart Analytics", desc: "Actionable insights", color: "purple-500" },
              { icon: DollarSign, title: "Auto Collections", desc: "Automated tracking", color: "amber-500" }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="text-center cursor-pointer"
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-${feature.color}/10 rounded-2xl mb-4`}>
                    <Icon className={`w-8 h-8 text-${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">{feature.title}</h3>
                  <p className="text-zinc-600">{feature.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 px-4 bg-zinc-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to transform your cash flow?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            Join 200+ GCC companies already using Tadfuq
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 bg-neon text-zinc-900 px-10 py-5 rounded-xl font-bold text-lg hover:bg-neon/90 transition-all shadow-2xl"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
