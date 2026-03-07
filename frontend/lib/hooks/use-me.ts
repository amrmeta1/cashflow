"use client";

import type { User } from "@/lib/api/types";

export function useMe() {
  // Mock user data since authentication is removed
  const DEV_ROLES = ["tenant_admin", "owner"];
  
  return {
    user: {
      sub: "demo-user",
      id: "demo-user",
      email: "demo@TadFuq.ai",
      full_name: "Demo User",
      name: "Demo User",
      avatar_url: "",
      status: "active",
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User,
    roles: DEV_ROLES,
    isLoading: false,
    isError: false,
  };
}
