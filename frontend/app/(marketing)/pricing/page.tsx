"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { useState } from "react";

const PLANS = [
  {
    name: "Starter",
    price: "$39",
    period: "per month",
    description: "Perfect for small businesses just getting started",
    features: [
      "Up to 3 companies",
      "Unlimited users",
      "Core financial reports",
      "Cash flow forecasting",
      "Email support"
    ],
    cta: "Start free trial",
    highlighted: false
  },
  {
    name: "Growth",
    price: "$89",
    period: "per month",
    description: "For growing businesses that need more power",
    features: [
      "Up to 10 companies",
      "Unlimited users",
      "Advanced analytics",
      "Custom KPIs",
      "Priority support",
      "API access"
    ],
    cta: "Start free trial",
    highlighted: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with complex needs",
    features: [
      "Unlimited companies",
      "Unlimited users",
      "White-label options",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee"
    ],
    cta: "Contact sales",
    highlighted: false
  }
];

const FAQS = [
  {
    question: "Can I try Tadfuq for free?",
    answer: "Yes! We offer a 14-day free trial on all plans. No credit card required."
  },
  {
    question: "Can I change plans later?",
    answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, debit cards, and bank transfers for annual plans."
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We use bank-level encryption and are SOC 2 Type II certified. Your data is stored securely in the cloud."
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer: "Yes! Save 20% when you pay annually instead of monthly."
  }
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4 bg-gradient-to-b from-white to-zinc-50">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-zinc-900 mb-6"
          >
            Simple, transparent pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-zinc-600 mb-4"
          >
            Choose the plan that&apos;s right for your business
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-zinc-500"
          >
            14-day free trial • No credit card required • Cancel anytime
          </motion.p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4">
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
          className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {PLANS.map((plan, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
              className={`relative bg-white rounded-2xl p-8 ${
                plan.highlighted
                  ? "border-2 border-neon shadow-2xl shadow-neon/20"
                  : "border border-zinc-200 shadow-lg"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-neon text-zinc-900 px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-zinc-900 mb-2">{plan.name}</h3>
                <p className="text-zinc-600 text-sm">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-zinc-900">{plan.price}</span>
                  {plan.period && <span className="text-zinc-600">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-neon flex-shrink-0 mt-0.5" />
                    <span className="text-zinc-600">{plan.period}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/demo"
                className={`block w-full text-center py-4 rounded-xl font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-neon text-zinc-900 hover:bg-neon/90 shadow-lg hover:shadow-xl"
                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 px-4 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-4">
              Compare features
            </h2>
            <p className="text-xl text-zinc-600">
              See what&apos;s included in each plan
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-zinc-900">Feature</th>
                    <th className="text-center py-4 px-6 font-semibold text-zinc-900">Starter</th>
                    <th className="text-center py-4 px-6 font-semibold text-zinc-900">Growth</th>
                    <th className="text-center py-4 px-6 font-semibold text-zinc-900">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {[
                    ["Companies", "3", "10", "Unlimited"],
                    ["Users", "Unlimited", "Unlimited", "Unlimited"],
                    ["Financial reports", "✓", "✓", "✓"],
                    ["Cash flow forecasting", "✓", "✓", "✓"],
                    ["Advanced analytics", "—", "✓", "✓"],
                    ["Custom KPIs", "—", "✓", "✓"],
                    ["API access", "—", "✓", "✓"],
                    ["White-label", "—", "—", "✓"],
                    ["Dedicated support", "—", "—", "✓"]
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-4 px-6 text-zinc-700">{row[0]}</td>
                      <td className="py-4 px-6 text-center text-zinc-600">{row[1]}</td>
                      <td className="py-4 px-6 text-center text-zinc-600">{row[2]}</td>
                      <td className="py-4 px-6 text-center text-zinc-600">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-xl text-zinc-600">
              Everything you need to know about our pricing
            </p>
          </motion.div>

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
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-zinc-50 transition-colors"
                >
                  <span className="font-semibold text-zinc-900">{faq.question}</span>
                  <ArrowRight
                    className={`w-5 h-5 text-zinc-400 transition-transform ${
                      openFaq === i ? "rotate-90" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-zinc-600">
                    {faq.answer}
                  </div>
                )}
              </motion.div>
            ))}
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
            Ready to get started?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            Join hundreds of GCC companies using Tadfuq
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 bg-neon text-zinc-900 px-10 py-5 rounded-xl font-bold text-lg hover:bg-neon/90 transition-all shadow-2xl"
            >
              Start free trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-white text-zinc-900 px-10 py-5 rounded-xl font-bold text-lg hover:bg-zinc-100 transition-all"
            >
              Contact sales
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
