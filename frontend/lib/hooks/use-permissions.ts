"use client";

// Simplified permissions hook - no authentication required
export function usePermissions() {
  // Grant all permissions since there's no authentication
  return {
    roles: ["admin"],
    isLoading: false,
    can: (permission: string) => true,
    canAny: (permissions: string[]) => true,
    hasRole: (role: string) => true,
    hasAnyRole: (check: string[]) => true,
    isAdminOrOwner: () => true,
    isFinanceAndAbove: () => true,
    canAccessRoute: (href: string) => true,
    visibleNav: () => true,
  };
}
