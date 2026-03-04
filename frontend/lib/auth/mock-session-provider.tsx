"use client";

import React, { createContext, useContext, useMemo } from "react";

interface Session {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires?: string;
  accessToken?: string;
  roles?: string[];
  tenantId?: string;
  error?: string;
}

interface SessionContextValue {
  data: Session | null;
  status: "authenticated" | "loading" | "unauthenticated";
  update: (data?: any) => Promise<Session | null>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * MockSessionProvider provides a custom session context that mimics NextAuth's SessionProvider
 * but doesn't require a backend. This allows useSession() to work without NextAuth API calls.
 * 
 * When DEV_SKIP_AUTH=true, this provider is used instead of the real SessionProvider.
 */
export function MockSessionProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<SessionContextValue>(
    () => ({
      data: null,
      status: "unauthenticated",
      update: async () => null,
    }),
    []
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Custom useSession hook that works with MockSessionProvider
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within MockSessionProvider");
  }
  return context;
}

/**
 * Mock signIn function that does nothing
 */
export function signIn() {
  return Promise.resolve(undefined);
}

/**
 * Mock signOut function that does nothing
 */
export function signOut() {
  return Promise.resolve(undefined);
}
