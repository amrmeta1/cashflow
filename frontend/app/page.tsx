"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true";

// Root page redirects to dashboard in dev mode, marketing home in production
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (DEV_SKIP_AUTH) {
      router.replace("/app/dashboard");
    } else {
      router.replace("/home");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
