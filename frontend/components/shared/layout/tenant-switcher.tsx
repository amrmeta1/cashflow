"use client";

import { Building2, ChevronDown, Plus } from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select";

export function TenantSwitcher() {
  const { currentTenant, memberships, setCurrentTenant } = useTenant();
  const { can } = usePermissions();
  const { t } = useI18n();

  if (memberships.length === 0) return null;

  return (
    <Select
      value={currentTenant?.id ?? ""}
      onValueChange={(id) => {
        const m = memberships.find((m) => m.tenant_id === id);
        if (m?.tenant) setCurrentTenant(m.tenant);
      }}
    >
      <SelectTrigger className="h-7 w-[160px] text-xs border-border/60 bg-muted/40 hover:bg-muted focus:ring-0 focus:ring-offset-0">
        <Building2 className="h-3 w-3 me-1.5 text-muted-foreground shrink-0" />
        <SelectValue placeholder={t.tenant.switchOrg} />
      </SelectTrigger>
      <SelectContent>
        {memberships.map((m) => (
          <SelectItem key={m.tenant_id} value={m.tenant_id} className="text-xs">
            {m.tenant?.name ?? m.tenant_id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
