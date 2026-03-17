"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { RouteGuard } from "@/components/shared/layout/route-guard";

const tabs = [
  { href: "/settings/organization", labelKey: "organization" as const },
  { href: "/settings/members", labelKey: "members" as const },
  { href: "/settings/roles", labelKey: "roles" as const },
  { href: "/settings/integrations", labelKey: "integrations" as const },
  { href: "/settings/security", labelKey: "security" as const, permission: "audit:read" as const },
  { href: "/settings/audit-logs", labelKey: "auditLogs" as const, permission: "audit:read" as const },
  { href: "/settings/system-status", labelKey: "systemStatus" as const, permission: "audit:read" as const },
  { href: "/settings/treasury-controls", labelKey: "treasuryControls" as const },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { can } = usePermissions();

  return (
    <RouteGuard allowedRoles={["tenant_admin", "owner"]}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t.settings.title}</h1>
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => {
            if ("permission" in tab && tab.permission && !can(tab.permission)) return null;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                  pathname === tab.href
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.nav[tab.labelKey]}
              </Link>
            );
          })}
        </div>
        {children}
      </div>
    </RouteGuard>
  );
}
