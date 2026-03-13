"use client";

import { Providers } from "@/lib/providers";
import { AppShell } from "@/components/shared/layout/app-shell";
import { OnboardingGuard } from "@/components/shared/providers/OnboardingGuard";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <OnboardingGuard>
            <AppShell>{children}</AppShell>
          </OnboardingGuard>
        </Providers>
      </body>
    </html>
  );
}
