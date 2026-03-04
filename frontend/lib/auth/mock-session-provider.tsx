"use client";

import React, { createContext, useContext } from "react";

interface MockSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires?: string;
}

interface MockSessionContextValue {
  data: MockSession | null;
  status: "authenticated" | "loading" | "unauthenticated";
  update: () => Promise<MockSession | null>;
}

const MockSessionContext = createContext<MockSessionContextValue>({
  data: null,
  status: "unauthenticated",
  update: async () => null,
});

export function MockSessionProvider({ children }: { children: React.ReactNode }) {
  const value: MockSessionContextValue = {
    data: null,
    status: "unauthenticated",
    update: async () => null,
  };

  return (
    <MockSessionContext.Provider value={value}>
      {children}
    </MockSessionContext.Provider>
  );
}

export function useMockSession() {
  return useContext(MockSessionContext);
}
