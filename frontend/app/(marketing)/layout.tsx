"use client";

import { useI18n } from "@/lib/i18n/context";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { LandingFooter } from "@/components/marketing/landing-footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dir } = useI18n();

  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-landing-darker">
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
}
