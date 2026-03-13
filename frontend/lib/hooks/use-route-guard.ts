"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/hooks/use-me";
import { useToast } from "@/components/shared/ui/toast";
import type { Role } from "@/lib/api/types";

export type GuardStatus = "loading" | "authorized" | "unauthorized";

export interface RouteGuardResult {
  status: GuardStatus;
}

export function useRouteGuard(allowedRoles: Role[]): RouteGuardResult {
  const router = useRouter();
  const { toast } = useToast();
  const { roles, isLoading } = useMe();

  const authorized =
    !isLoading &&
    (allowedRoles.length === 0 ||
      allowedRoles.some((r) => roles.includes(r)));

  const unauthorized = !isLoading && !authorized;

  useEffect(() => {
    if (unauthorized) {
      toast({
        title: "Unauthorized Access",
        description: "You don't have permission to view this page.",
        variant: "destructive",
      });
      router.replace("/liquidity/dashboard");
    }
  }, [unauthorized, router, toast]);

  if (isLoading) return { status: "loading" };
  if (unauthorized) return { status: "unauthorized" };
  return { status: "authorized" };
}
