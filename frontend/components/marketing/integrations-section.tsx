"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const INTEGRATIONS = [
  { name: "Sage", logo: "🟢", color: "bg-green-50" },
  { name: "QuickBooks Online", logo: "QB", color: "bg-green-100" },
  { name: "Xero", logo: "X", color: "bg-blue-100" },
  { name: "Excel", logo: "X", color: "bg-green-600" },
  { name: "Access Financials UK", logo: "A", color: "bg-red-50" }
] as const;

export function IntegrationsSection() {
  return (
    <section className="py-20 md:py-32 px-4 bg-zinc-50">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            INTEGRATIONS
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6">
            Connect to your favorite accounting software
          </h2>
          
          <p className="text-lg text-zinc-600 mb-8 leading-relaxed">
            Tadfuq integrates directly with leading accounting platforms. Making it easy to get started, stay connected and get more out of your financial data.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link
              href="/demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-neon text-zinc-900 rounded-lg font-semibold text-base hover:bg-neon/90 transition-all shadow-lg hover:shadow-xl"
            >
              Start a free trial
            </Link>
          </motion.div>
        </motion.div>

        {/* Right Integration Logos */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="space-y-4"
          >
            {INTEGRATIONS.map((integration, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, x: 20 },
                  visible: { opacity: 1, x: 0 }
                }}
                whileHover={{ scale: 1.02, x: 5 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
              >
                {/* Logo */}
                <div className={`w-14 h-14 ${integration.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  {integration.name === "Sage" && (
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#10b981" />
                    </svg>
                  )}
                  {integration.name === "QuickBooks Online" && (
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">qb</span>
                    </div>
                  )}
                  {integration.name === "Xero" && (
                    <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">x</span>
                    </div>
                  )}
                  {integration.name === "Excel" && (
                    <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-lg">X</span>
                    </div>
                  )}
                  {integration.name === "Access Financials UK" && (
                    <div className="w-10 h-10 border-2 border-red-400 rounded-full flex items-center justify-center">
                      <span className="text-red-400 font-bold text-sm">access</span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-900">{integration.name}</h3>
                </div>

                {/* Arrow */}
                <div className="text-zinc-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
