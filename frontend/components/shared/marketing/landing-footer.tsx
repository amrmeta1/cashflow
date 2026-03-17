"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export function LandingFooter() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <footer id="about" className="bg-landing-darker border-t border-white/10 py-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">
          <div>
            <Link href="/home" className="flex items-center gap-2 mb-4">
              <span className="font-bold text-white text-lg">Tadfuq</span>
              <span className="text-neon font-bold text-lg">.ai</span>
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-[220px]">
              {isAr
                ? "إدارة التدفق النقدي بالذكاء الاصطناعي لشركات الخليج"
                : "AI-powered cash flow management for GCC enterprises."}
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-xs text-zinc-400 uppercase tracking-wider mb-4">
              {isAr ? "الحلول" : "Solutions"}
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              {[
                { en: "Liquidity", ar: "السيولة", href: "#liquidity" },
                { en: "AI Agents", ar: "وكلاء AI", href: "#agents" },
                { en: "Consolidation", ar: "التوحيد", href: "#platform" },
              ].map(({ en, ar, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">
                    {isAr ? ar : en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-xs text-zinc-400 uppercase tracking-wider mb-4">
              {isAr ? "الشركة" : "Company"}
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  {isAr ? "الأسعار" : "Pricing"}
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-white transition-colors">
                  {isAr ? "الأمان" : "Security"}
                </Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-white transition-colors">
                  {isAr ? "اطلب عرضًا" : "Request Demo"}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-xs text-zinc-400 uppercase tracking-wider mb-4">
              {isAr ? "تواصل" : "Contact"}
            </h3>
            <p className="text-sm text-zinc-500">hello@TadFuq.ai</p>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Tadfuq.ai. {isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}
          </p>
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <Link href="/security" className="hover:text-white transition-colors">
              {isAr ? "الأمان" : "Security"}
            </Link>
            <Link href="/partners/accounting-firms" className="hover:text-white transition-colors">
              {isAr ? "الشركاء" : "Partners"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
