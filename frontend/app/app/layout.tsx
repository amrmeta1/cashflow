"use client";

import { AppShell } from "@/components/layout/app-shell";
import { OnboardingGuard } from "@/components/providers/OnboardingGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGuard>
      <AppShell>{children}</AppShell>
    </OnboardingGuard>
  );
}
