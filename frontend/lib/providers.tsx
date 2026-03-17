"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n/context";
import { TenantProvider } from "@/lib/hooks/use-tenant";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { EntityProvider } from "@/contexts/EntityContext";
import { ScenarioProvider } from "@/contexts/ScenarioContext";
import { TenantSegmentProvider } from "@/contexts/TenantSegmentContext";
import { ToastProvider } from "@/components/shared/ui/toast";
import { CommandMenuProvider } from "@/lib/command-store";
import { CommandPalette } from "@/components/shared/global/command-palette";

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <ToastProvider>
          <I18nProvider>
            <TenantProvider>
              <TenantSegmentProvider>
                <CompanyProvider>
                  <CurrencyProvider>
                    <EntityProvider>
                      <ScenarioProvider>
                        <CommandMenuProvider>
                          {children}
                          <CommandPalette />
                        </CommandMenuProvider>
                      </ScenarioProvider>
                    </EntityProvider>
                  </CurrencyProvider>
                </CompanyProvider>
              </TenantSegmentProvider>
            </TenantProvider>
          </I18nProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
