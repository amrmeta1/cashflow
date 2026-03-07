"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";

const SOLUTIONS = [
  {
    title: "Treasury Management",
    icon: "📊",
    links: [
      { name: "Cash Management", href: "/solutions/cash-management" },
      { name: "Cash Flow Planning", href: "/solutions/cash-flow-planning" },
      { name: "Debt Management", href: "/solutions/debt-management" },
      { name: "Factoring management", href: "/solutions/factoring" },
      { name: "Investment management", href: "/solutions/investment" },
      { name: "Reporting", href: "/solutions/reporting" }
    ]
  },
  {
    title: "Accounts Payable automation",
    icon: "💳",
    links: [
      { name: "Budgets", href: "/solutions/budgets" },
      { name: "Procurement management", href: "/solutions/procurement" },
      { name: "Supplier payment", href: "/solutions/supplier-payment" },
      { name: "Accounting automation", href: "/solutions/accounting-automation" }
    ]
  },
  {
    title: "Accounts Receivable automation",
    icon: "💰",
    links: [
      { name: "DSO analytics", href: "/solutions/dso-analytics" },
      { name: "Cash collection", href: "/solutions/cash-collection" },
      { name: "Factoring management", href: "/solutions/factoring-management" },
      { name: "Accounting automation", href: "/solutions/ar-automation" }
    ]
  },
  {
    title: "Payments",
    icon: "💸",
    links: [
      { name: "Payment protocols", href: "/solutions/payment-protocols" },
      { name: "Beneficiaries management", href: "/solutions/beneficiaries" },
      { name: "Validation workflows", href: "/solutions/validation" }
    ]
  },
  {
    title: "Our platform",
    icon: "🔧",
    links: [
      { name: "Support", href: "/support" },
      { name: "Security", href: "/security" },
      { name: "Mobile App", href: "/mobile" },
      { name: "Our integrations", href: "/integrations" },
      { name: "Tadfuq AI", href: "/ai" }
    ]
  },
  {
    title: "Connectivity",
    icon: "🔗",
    links: [
      { name: "Bank connectivity", href: "/solutions/bank-connectivity" },
      { name: "ERP connectivity", href: "/solutions/erp-connectivity" },
      { name: "API Tadfuq", href: "/api" }
    ]
  }
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4 bg-gradient-to-b from-zinc-900 to-zinc-800">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-white mb-6"
          >
            Complete Treasury Solutions
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-zinc-300 max-w-3xl mx-auto"
          >
            Comprehensive financial management tools designed for modern enterprises in the GCC region
          </motion.p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left 3 columns - Solutions */}
            <div className="lg:col-span-3">
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {SOLUTIONS.map((solution, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className="bg-zinc-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Category Header */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-200">
                      <span className="text-2xl">{solution.icon}</span>
                      <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                        {solution.title}
                        <ExternalLink className="w-4 h-4 text-zinc-400" />
                      </h3>
                    </div>

                    {/* Links */}
                    <ul className="space-y-3">
                      {solution.links.map((link, j) => (
                        <li key={j}>
                          <Link
                            href={link.href}
                            className="text-zinc-700 hover:text-neon transition-colors text-sm flex items-center gap-2 group"
                          >
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full group-hover:bg-neon transition-colors"></span>
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Right column - CTA Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-24">
                <div className="bg-zinc-900 rounded-2xl p-8 text-center">
                  {/* Icon */}
                  <div className="w-20 h-20 mx-auto mb-6 bg-neon/10 rounded-2xl flex items-center justify-center">
                    <div className="relative">
                      <div className="w-12 h-12 bg-neon rounded-lg flex items-center justify-center">
                        <span className="text-2xl font-bold text-zinc-900">A</span>
                      </div>
                      {/* Connecting dots */}
                      <div className="absolute -top-3 -left-3 w-3 h-3 bg-zinc-700 rounded-sm"></div>
                      <div className="absolute -top-3 -right-3 w-3 h-3 bg-zinc-700 rounded-sm"></div>
                      <div className="absolute -bottom-3 -left-3 w-3 h-3 bg-zinc-700 rounded-sm"></div>
                      <div className="absolute -bottom-3 -right-3 w-3 h-3 bg-zinc-700 rounded-sm"></div>
                      {/* Connecting lines */}
                      <div className="absolute top-1/2 -left-6 w-6 h-0.5 bg-neon/30"></div>
                      <div className="absolute top-1/2 -right-6 w-6 h-0.5 bg-neon/30"></div>
                      <div className="absolute left-1/2 -top-6 w-0.5 h-6 bg-neon/30"></div>
                      <div className="absolute left-1/2 -bottom-6 w-0.5 h-6 bg-neon/30"></div>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">
                    A software that adapts to your company challenges
                  </h3>
                  <p className="text-zinc-400 text-sm mb-6">
                    Discover how Tadfuq can transform your treasury operations
                  </p>
                  <Link
                    href="/demo"
                    className="inline-flex items-center justify-center w-full gap-2 bg-white text-zinc-900 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-100 transition-all"
                  >
                    Request a demo
                  </Link>
                </div>

                {/* Personas */}
                <div className="mt-8 space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="bg-zinc-50 rounded-xl p-4 text-center"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 bg-zinc-200 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👔</span>
                    </div>
                    <h4 className="font-semibold text-zinc-900 text-sm">Chief Executive Officer</h4>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="bg-zinc-50 rounded-xl p-4 text-center"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 bg-zinc-200 rounded-full flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                    <h4 className="font-semibold text-zinc-900 text-sm">Purchasing Director</h4>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-4">
              Why choose Tadfuq?
            </h2>
            <p className="text-xl text-zinc-600">
              Built for the unique needs of GCC enterprises
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
                transition: { staggerChildren: 0.15 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: "🚀",
                title: "Fast Implementation",
                desc: "Get up and running in weeks, not months"
              },
              {
                icon: "🔒",
                title: "Bank-Grade Security",
                desc: "SOC 2 Type II certified with end-to-end encryption"
              },
              {
                icon: "🌍",
                title: "GCC Compliance",
                desc: "Built for ZATCA, VAT, and regional regulations"
              },
              {
                icon: "🤖",
                title: "AI-Powered",
                desc: "Smart automation for faster decision making"
              },
              {
                icon: "📱",
                title: "Mobile First",
                desc: "Manage treasury on the go with our mobile app"
              },
              {
                icon: "💬",
                title: "24/7 Support",
                desc: "Dedicated support team in your timezone"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">{feature.title}</h3>
                <p className="text-zinc-600">{feature.desc}</p>
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
            Ready to modernize your treasury?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            See how Tadfuq can transform your financial operations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 bg-neon text-zinc-900 px-10 py-5 rounded-xl font-bold text-lg hover:bg-neon/90 transition-all shadow-2xl"
            >
              Request a demo
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-white text-zinc-900 px-10 py-5 rounded-xl font-bold text-lg hover:bg-zinc-100 transition-all"
            >
              View pricing
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
