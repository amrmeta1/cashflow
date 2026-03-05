"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";

const ONBOARDING_PATH = "/app/onboarding";

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

  // Block render until hydrated — prevents FOUC / sidebar flash
  if (!isHydrated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Hydrated but not configured — spinner while redirect fires
  if (!profile.isConfigured) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
