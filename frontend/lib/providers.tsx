"use client";

import React, { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n/context";
import { TenantProvider } from "@/lib/hooks/use-tenant";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { EntityProvider } from "@/contexts/EntityContext";
import { ScenarioProvider } from "@/contexts/ScenarioContext";
import { TenantSegmentProvider } from "@/contexts/TenantSegmentContext";
import { ToastProvider } from "@/components/ui/toast";
import { CommandMenuProvider } from "@/lib/command-store";
import { CommandPalette } from "@/components/global/command-palette";
import { MockSessionProvider } from "@/lib/auth/mock-session-provider";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const content = (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TenantProvider>
          <CompanyProvider>
          <TenantSegmentProvider>
          <CurrencyProvider>
          <EntityProvider>
          <ScenarioProvider>
          <ToastProvider>
            <CommandMenuProvider>
              <CommandPalette />
              {children}
            </CommandMenuProvider>
          </ToastProvider>
          </ScenarioProvider>
          </EntityProvider>
          </CurrencyProvider>
          </TenantSegmentProvider>
          </CompanyProvider>
        </TenantProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

  const AuthWrapper = DEV_SKIP_AUTH ? MockSessionProvider : SessionProvider;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthWrapper>{content}</AuthWrapper>
    </ThemeProvider>
  );
}
