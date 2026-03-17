"use client";

import { useRouteGuard } from "@/lib/hooks/use-route-guard";
import { Skeleton } from "@/components/shared/ui/skeleton";
import type { Role } from "@/lib/api/types";

interface RouteGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

function GuardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 w-full">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

export function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const { status } = useRouteGuard(allowedRoles);

  // Don't block rendering - show content with loading state
  if (status === "loading") {
    console.warn("RouteGuard: Authorization checking, rendering children with loading state");
  }
  
  if (status === "unauthorized") {
    console.warn("RouteGuard: User unauthorized for roles:", allowedRoles);
    return null;
  }
  
  return <>{children}</>;
}
