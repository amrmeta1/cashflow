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
import { TenantSegmentProvider } from "@/contexts/TenantSegmentContext";
import { ToastProvider } from "@/components/ui/toast";
import { CommandMenuProvider } from "@/lib/command-store";
import { CommandPalette } from "@/components/global/command-palette";

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

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <TenantProvider>
              <CompanyProvider>
              <TenantSegmentProvider>
              <CurrencyProvider>
              <EntityProvider>
              <ToastProvider>
                <CommandMenuProvider>
                  <CommandPalette />
                  {children}
                </CommandMenuProvider>
              </ToastProvider>
              </EntityProvider>
              </CurrencyProvider>
              </TenantSegmentProvider>
              </CompanyProvider>
            </TenantProvider>
          </I18nProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
