"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getProfile } from "@/lib/api/tenant-api";
import { DEV_SKIP_AUTH } from "@/lib/api/mock-data";
import type { User } from "@/lib/api/types";

export interface MeResult {
  user: User | null;
  roles: string[];
  isLoading: boolean;
  isError: boolean;
}

const DEV_ROLES = ["tenant_admin", "owner"];

export function useMe(): MeResult {
  const { data: session, status } = useSession();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await getProfile();
      return res.data;
    },
    enabled: !DEV_SKIP_AUTH && status === "authenticated",
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (DEV_SKIP_AUTH) {
    return {
      user: null,
      roles: DEV_ROLES,
      isLoading: false,
      isError: false,
    };
  }

  const sessionRoles: string[] = session?.roles ?? [];

  return {
    user: data ?? null,
    roles: sessionRoles,
    isLoading: status === "loading" || (status === "authenticated" && isLoading),
    isError,
  };
}
