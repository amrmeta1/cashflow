"use client";

import React, { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n/context";
import { TenantProvider } from "@/lib/hooks/use-tenant";
import { ToastProvider } from "@/components/ui/toast";

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
              <ToastProvider>{children}</ToastProvider>
            </TenantProvider>
          </I18nProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
