"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CashFlowSection() {
  return (
    <section className="py-20 md:py-32 px-4 bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6">
            Cash flow forecasting
          </h2>
          <p className="text-lg text-zinc-600 mb-8 leading-relaxed">
            Achieve clarity and confidence about your future financial results and what needs to happen to achieve your plans.
          </p>
          <Link
            href="/features/forecasting"
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
            className="mt-12 p-6 bg-zinc-50 rounded-xl"
          >
            <p className="text-sm text-zinc-600 italic border-l-4 border-neon pl-4">
              &ldquo;Tadfuq&rsquo;s forecasting cut our cash surprises by 60%. Game changer.&rdquo; Incredibly powerful and incredibly valuable.
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-300 rounded-full"></div>
              <div>
                <div className="font-semibold text-zinc-900">David Maher</div>
                <div className="text-sm text-zinc-600">Director, Right Brain Insights</div>
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
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden">
            {/* Screenshot Header */}
            <div className="bg-zinc-50 border-b border-zinc-200 p-4">
              <div className="text-sm font-semibold text-zinc-700">Business Roadmap</div>
            </div>
            
            {/* Screenshot Content */}
            <div className="p-6">
              {/* Gantt Chart Visualization */}
              <div className="space-y-3 mb-6">
                {[
                  { label: "Hiring Event", color: "bg-blue-200" },
                  { label: "Product Office", color: "bg-purple-200" },
                  { label: "New Consultant", color: "bg-green-200" }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 * i }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-32 text-sm text-zinc-600">{item.label}</div>
                    <div className={`flex-1 h-8 ${item.color} rounded`}></div>
                  </motion.div>
                ))}
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left py-2 text-zinc-600 font-semibold">Category</th>
                      <th className="text-right py-2 text-zinc-600 font-semibold">Q1</th>
                      <th className="text-right py-2 text-zinc-600 font-semibold">Q2</th>
                      <th className="text-right py-2 text-zinc-600 font-semibold">Q3</th>
                      <th className="text-right py-2 text-zinc-600 font-semibold">Q4</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-100">
                      <td className="py-2 text-zinc-700">Revenue</td>
                      <td className="text-right text-zinc-900">$93,187</td>
                      <td className="text-right text-zinc-900">$104,211</td>
                      <td className="text-right text-zinc-900">$119,025</td>
                      <td className="text-right text-zinc-900">$127,341</td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td className="py-2 text-zinc-700">Expenses</td>
                      <td className="text-right text-zinc-900">$86,471</td>
                      <td className="text-right text-zinc-900">$91,238</td>
                      <td className="text-right text-zinc-900">$97,047</td>
                      <td className="text-right text-zinc-900">$103,281</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-zinc-700 font-semibold">Cash on Hand</td>
                      <td className="text-right text-zinc-900 font-semibold">$89,187</td>
                      <td className="text-right text-zinc-900 font-semibold">$102,160</td>
                      <td className="text-right text-zinc-900 font-semibold">$124,138</td>
                      <td className="text-right text-zinc-900 font-semibold">$148,198</td>
                    </tr>
                  </tbody>
                </table>
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
            <div className="bg-zinc-50 rounded-lg p-4">
              <h4 className="font-semibold text-zinc-900 mb-2">Three-way cash flow forecasts</h4>
              <p className="text-sm text-zinc-600">Accurately project P&L, Balance Sheet & Cash Flow statements.</p>
            </div>
            <div className="bg-zinc-50 rounded-lg p-4">
              <h4 className="font-semibold text-zinc-900 mb-2">Look to the future, confidently</h4>
              <p className="text-sm text-zinc-600">See the impact of your plans, and evaluate different scenarios.</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
