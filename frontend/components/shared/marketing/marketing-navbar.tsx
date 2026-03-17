"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const SOLUTIONS_DROPDOWN = {
  spotlight: {
    title: "Kyriba's Agentic AI: TAI",
    description: "The next leap in AI-powered treasury for CFOs and Treasury leaders.",
    image: "💼",
    link: "/ai"
  },
  products: [
    { name: "Treasury", description: "Real-time cash & treasury management", icon: "🏦", href: "/solutions/treasury" },
    { name: "Risk Management", description: "FX, Debt, Investments, Interest Rates", icon: "🛡️", href: "/solutions/risk" },
    { name: "Payments", description: "Automate & secure payment journeys", icon: "💳", href: "/solutions/payments" },
    { name: "Connectivity", description: "Bank, ERP & API connectivity", icon: "🔗", href: "/solutions/connectivity" },
    { name: "Working Capital", description: "Supplier & receivables financing", icon: "💰", href: "/solutions/working-capital" }
  ],
  useCases: [
    { name: "Accelerate ERP Migrations", href: "/use-cases/erp-migrations" },
    { name: "FX Risk Management", href: "/use-cases/fx-risk" },
    { name: "API Integration", href: "/use-cases/api" },
    { name: "ISO 20022 Migration", href: "/use-cases/iso-20022" },
    { name: "Trusted AI", href: "/use-cases/ai" },
    { name: "Liquidity Planning", href: "/use-cases/liquidity" },
    { name: "Cash Forecasting", href: "/use-cases/forecasting" },
    { name: "Real-time Payments", href: "/use-cases/payments" },
    { name: "Fraud Prevention", href: "/use-cases/fraud" },
    { name: "Supplier Financing", href: "/use-cases/supplier" },
    { name: "FX Exposure Management", href: "/use-cases/fx-exposure" }
  ]
};

const PRODUCTS_DROPDOWN = {
  categories: [
    {
      title: "Treasury Management",
      items: [
        { name: "Cash Management", href: "/products/cash-management" },
        { name: "Cash Flow Forecasting", href: "/products/forecasting" },
        { name: "Liquidity Planning", href: "/products/liquidity" }
      ]
    },
    {
      title: "Risk & Compliance",
      items: [
        { name: "FX Risk Management", href: "/products/fx-risk" },
        { name: "Fraud Detection", href: "/products/fraud" },
        { name: "Compliance Tools", href: "/products/compliance" }
      ]
    },
    {
      title: "Payments & Collections",
      items: [
        { name: "Payment Automation", href: "/products/payments" },
        { name: "Collections Management", href: "/products/collections" },
        { name: "Bank Connectivity", href: "/products/connectivity" }
      ]
    },
    {
      title: "Analytics & AI",
      items: [
        { name: "Financial Analytics", href: "/products/analytics" },
        { name: "AI Insights", href: "/products/ai" },
        { name: "Custom Reports", href: "/products/reports" }
      ]
    }
  ]
};

const MENU_ITEMS = [
  { key: "solutions", en: "Solutions", ar: "الحلول", href: "/solutions", hasDropdown: true, dropdownType: "solutions" },
  { key: "products", en: "Products", ar: "المنتجات", href: "/products", hasDropdown: true, dropdownType: "products" },
  { key: "liquidity", en: "Liquidity Performance", ar: "أداء السيولة", href: "#liquidity" },
  { key: "agents", en: "Agents", ar: "الوكلاء", href: "#agents" },
  { key: "resources", en: "Resources", ar: "الموارد", href: "#resources" },
  { key: "pricing", en: "Pricing", ar: "الأسعار", href: "/pricing" },
  { key: "about", en: "About", ar: "عن تدفق", href: "#about" },
];

export function MarketingNavbar() {
  const { locale, setLocale, dir } = useI18n();
  const isAr = locale === "ar";
  const [showSolutionsDropdown, setShowSolutionsDropdown] = useState(false);
  const [showProductsDropdown, setShowProductsDropdown] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/5",
        "bg-landing-darker/95 supports-[backdrop-filter]:bg-landing-darker/80"
      )}
    >
      <div className="mx-auto max-w-7xl flex h-16 items-center justify-between gap-6 px-4 md:px-6 lg:px-8">
        {/* Logo — Tadfuq.ai with neon accent */}
        <Link
          href="/home"
          className="flex items-center gap-2 shrink-0 font-bold text-lg tracking-tight text-white"
        >
          <span>Tadfuq</span>
          <span className="text-neon">.ai</span>
        </Link>

        {/* Center nav — Kyriba-style menu */}
        <nav className="hidden lg:flex items-center gap-8 text-sm">
          {MENU_ITEMS.map(({ key, en, ar, href, hasDropdown, dropdownType }) => (
            <div
              key={key}
              className="relative"
              onMouseEnter={() => {
                if (dropdownType === "solutions") setShowSolutionsDropdown(true);
                if (dropdownType === "products") setShowProductsDropdown(true);
              }}
              onMouseLeave={() => {
                if (dropdownType === "solutions") setShowSolutionsDropdown(false);
                if (dropdownType === "products") setShowProductsDropdown(false);
              }}
            >
              <Link
                href={href}
                className="text-zinc-400 hover:text-white transition-colors whitespace-nowrap flex items-center gap-1"
              >
                {isAr ? ar : en}
                {hasDropdown && <ChevronDown className="w-4 h-4" />}
              </Link>

              {/* Solutions Dropdown */}
              {dropdownType === "solutions" && showSolutionsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-[750px] bg-zinc-100 rounded-lg shadow-2xl border border-zinc-200 p-6"
                >
                  <div className="grid grid-cols-3 gap-6">
                    {/* Column 1: Spotlight */}
                    <div>
                      <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                        SPOTLIGHT
                      </h4>
                      <Link
                        href={SOLUTIONS_DROPDOWN.spotlight.link}
                        className="block bg-white rounded-lg p-3 hover:shadow-lg transition-shadow"
                      >
                        <div className="text-2xl mb-2">{SOLUTIONS_DROPDOWN.spotlight.image}</div>
                        <h5 className="font-bold text-zinc-900 mb-1 text-sm">
                          {SOLUTIONS_DROPDOWN.spotlight.title}
                        </h5>
                        <p className="text-xs text-zinc-600 mb-2 leading-snug">
                          {SOLUTIONS_DROPDOWN.spotlight.description}
                        </p>
                        <span className="text-xs text-neon font-semibold">
                          Learn more →
                        </span>
                      </Link>
                    </div>

                    {/* Column 2: Products */}
                    <div>
                      <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                        PRODUCTS
                      </h4>
                      <ul className="space-y-2">
                        {SOLUTIONS_DROPDOWN.products.map((product, i) => (
                          <li key={i}>
                            <Link
                              href={product.href}
                              className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white transition-colors group"
                            >
                              <div className="w-6 h-6 bg-zinc-200 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-neon/10 transition-colors">
                                <span className="text-sm">{product.icon}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-zinc-900 text-xs group-hover:text-neon transition-colors">
                                  {product.name}
                                </div>
                                <div className="text-[10px] text-zinc-600 leading-tight">
                                  {product.description}
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Column 3: Use Cases */}
                    <div>
                      <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                        USE CASES
                      </h4>
                      <div className="grid grid-cols-1 gap-1">
                        {SOLUTIONS_DROPDOWN.useCases.map((useCase, i) => (
                          <Link
                            key={i}
                            href={useCase.href}
                            className="text-xs text-zinc-700 hover:text-neon transition-colors py-1 px-2 rounded hover:bg-white"
                          >
                            {useCase.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Products Dropdown */}
              {dropdownType === "products" && showProductsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-[600px] bg-zinc-100 rounded-lg shadow-2xl border border-zinc-200 p-6"
                >
                  <div className="grid grid-cols-4 gap-6">
                    {PRODUCTS_DROPDOWN.categories.map((category, i) => (
                      <div key={i}>
                        <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                          {category.title}
                        </h4>
                        <ul className="space-y-1.5">
                          {category.items.map((item, j) => (
                            <li key={j}>
                              <Link
                                href={item.href}
                                className="text-xs text-zinc-700 hover:text-neon transition-colors py-1 px-2 rounded hover:bg-white block"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </nav>

        {/* Right: Language + Login + Request Demo */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-landing-darker"
            aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
            aria-pressed={locale === "ar" ? "true" : "false"}
          >
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            <span className={locale === "en" ? "text-neon font-medium" : ""}>EN</span>
            <span className="text-zinc-600" aria-hidden>|</span>
            <span className={locale === "ar" ? "text-neon font-medium" : ""}>عربي</span>
          </button>

          <Link
            href="/login"
            className="text-sm text-zinc-300 hover:text-white transition-colors px-3 py-2 hidden sm:inline-block"
          >
            {isAr ? "تسجيل الدخول" : "Login"}
          </Link>

          <Link
            href="/demo"
            className={cn(
              "rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
              "bg-neon text-landing-darker hover:bg-neon/90 hover:shadow-[0_0_24px_rgba(0,255,170,0.4)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-landing-darker"
            )}
            aria-label={isAr ? "اطلب عرضًا توضيحيًا" : "Request a demo"}
          >
            {isAr ? "اطلب عرضًا" : "Request Demo"}
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
