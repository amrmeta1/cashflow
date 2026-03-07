"use client";

import { useI18n } from "@/lib/i18n/context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Authentication removed - permissions not needed
import type { Role } from "@/lib/api/types";

const ROLES: { role: Role; description: string }[] = [
  { role: "tenant_admin", description: "Full access to all tenant resources" },
  { role: "owner", description: "Manage members and view all data" },
  { role: "finance_manager", description: "Read access plus audit logs" },
  { role: "accountant_readonly", description: "Read-only access to tenant data" },
  { role: "group_cfo", description: "Full access across all entities" },
  { role: "treasury_director", description: "Treasury, FX, forecasts" },
  { role: "financial_controller", description: "Single entity scope (read)" },
  { role: "ap_manager", description: "Payables workflows only" },
  { role: "ar_manager", description: "Receivables workflows only" },
  { role: "bank_relationship_manager", description: "Bank accounts read only" },
  { role: "auditor_readonly", description: "Full read + audit log export" },
  { role: "board_member", description: "Executive summary only" },
];

export default function RolesPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <CardTitle className="text-base">{t.settings.rolesTitle}</CardTitle>
        <CardDescription className="mt-1">
          {t.settings.rolesDescription}
        </CardDescription>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ROLES.map(({ role, description }) => {
          const permissions: string[] = []; // No permissions needed without auth
          return (
            <Card key={role}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t.roles[role]}</CardTitle>
                <CardDescription className="text-xs">
                  {description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {permissions.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
