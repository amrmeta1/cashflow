"use client";

import React from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * MockSessionProvider wraps NextAuthSessionProvider but doesn't require
 * a valid NextAuth backend. It allows useSession() to work without errors.
 * 
 * When DEV_SKIP_AUTH=true, this provider is used instead of the real SessionProvider.
 * The session will always be null/unauthenticated, which is what we want for dev mode.
 */
export function MockSessionProvider({ children }: { children: React.ReactNode }) {
  // We still use the real SessionProvider, but with session={null}
  // This ensures useSession() works correctly throughout the app
  return (
    <NextAuthSessionProvider session={null} refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
    </NextAuthSessionProvider>
  );
}
