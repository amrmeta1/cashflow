"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";

const ONBOARDING_PATH = "/onboarding";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const companyContext = useCompany();
  const profile = companyContext?.profile;
  const isHydrated = companyContext?.isHydrated;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isHydrated && !profile?.isConfigured && pathname !== ONBOARDING_PATH) {
      router.replace(ONBOARDING_PATH);
    }
  }, [isHydrated, profile.isConfigured, pathname, router]);

  // Always render the onboarding page itself — never block it
  if (pathname === ONBOARDING_PATH) {
    return <>{children}</>;
  }

  // Don't block rendering - just log warnings
  if (!isHydrated) {
    console.warn("OnboardingGuard: Not hydrated yet, rendering children anyway");
  }

  if (!profile?.isConfigured) {
    console.warn("OnboardingGuard: Profile not configured, rendering children anyway");
  }

  // Always render children - no blocking
  return <>{children}</>;
}
