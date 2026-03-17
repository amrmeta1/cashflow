"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/shared/layout/app-shell";
import { DemoProvider } from "@/contexts/DemoContext";
import { DemoCompanySync } from "@/components/shared/demo/DemoCompanySync";

/**
 * Client demo layout: provides demo context and company override,
 * skips OnboardingGuard by not using app layout, and wraps content in AppShell.
 */
export default function DemoSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Invalid demo. Use /demo/[company-slug], e.g. /demo/harbi-contracting
      </div>
    );
  }

  return (
    <DemoProvider slug={slug}>
      <DemoCompanySync />
      <AppShell>{children}</AppShell>
    </DemoProvider>
  );
}
