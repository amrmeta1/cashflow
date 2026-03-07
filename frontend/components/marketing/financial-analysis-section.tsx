"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function FinancialAnalysisSection() {
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
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6">
            Financial analysis
          </h2>
          <p className="text-lg text-zinc-600 mb-8 leading-relaxed">
            Get in-depth analysis of your numbers and a clearer picture of your business performance.
          </p>
          <Link
            href="/features/analysis"
            className="inline-flex items-center gap-2 text-neon font-semibold hover:gap-3 transition-all"
          >
            Learn more
            <ArrowRight className="w-5 h-5" />
          </Link>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 p-6 bg-white rounded-xl shadow-sm"
          >
            <p className="text-sm text-zinc-600 italic border-l-4 border-neon pl-4">
              &ldquo;The insights dashboard is phenomenal. We spot trends instantly.&rdquo; for people with no financial background.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-300 rounded-full"></div>
              <div>
                <div className="font-semibold text-zinc-900">Robin Joe Kong</div>
                <div className="text-sm text-zinc-600">Advisor, NBC</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Screenshot */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Main Screenshot with overlay */}
          <div className="relative bg-zinc-300 rounded-xl overflow-hidden shadow-2xl">
            {/* Background pattern */}
            <div className="h-96 bg-gradient-to-br from-zinc-200 to-zinc-400 flex items-center justify-center">
              {/* Revenue Growth Card Overlay */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute top-8 right-8 bg-white rounded-lg shadow-2xl p-6 w-80"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-neon rounded flex items-center justify-center text-white text-xs">✓</div>
                  <h3 className="font-semibold text-zinc-900">Revenue Growth</h3>
                </div>
                
                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">% change in revenue</div>
                    <div className="text-2xl font-bold text-zinc-900">34.85%</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Revenue growth rate</div>
                    <div className="text-2xl font-bold text-neon">↑ 5.11%</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Average revenue growth</div>
                    <div className="text-2xl font-bold text-zinc-900">↓ 3.45%</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Revenue growth (3 months)</div>
                    <div className="text-lg font-semibold text-zinc-900">2.11%</div>
                  </div>
                </div>

                {/* Line Chart */}
                <div className="h-32 relative">
                  <svg className="w-full h-full" viewBox="0 0 300 100">
                    <polyline
                      points="0,80 30,70 60,75 90,60 120,65 150,50 180,55 210,40 240,45 270,30 300,35"
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </motion.div>

              {/* Decorative elements */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="flex-1 h-1 bg-zinc-400/30 rounded"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature Cards Below */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 gap-4 mt-6"
          >
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold text-zinc-900 mb-2">Measure what matters</h4>
              <p className="text-sm text-zinc-600">Measure and monitor the KPIs which matter most to your business</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold text-zinc-900 mb-2">Insights at a glance</h4>
              <p className="text-sm text-zinc-600">Understand your business better with visual insights</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
