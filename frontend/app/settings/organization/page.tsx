"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { getTenant } from "@/lib/api/enterprise-api";
import { Badge } from "@/components/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";

export default function OrganizationPage() {
  const { t } = useI18n();
  const { currentTenant } = useTenant();

  const { data } = useQuery({
    queryKey: ["tenant", currentTenant?.id],
    queryFn: () => getTenant(currentTenant!.id),
    enabled: !!currentTenant,
    retry: false,
  });

  const MOCK_TENANT = {
    name: "Demo Organization",
    slug: "demo-org",
    plan: "Growth",
    status: "active" as const,
  };

  const tenant = data ?? currentTenant ?? MOCK_TENANT;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.settings.orgProfile}</CardTitle>
      </CardHeader>
      <CardContent>
        {tenant ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">{t.settings.orgNameLabel}</dt>
              <dd className="font-medium">{tenant?.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t.settings.orgSlugLabel}</dt>
              <dd className="font-mono text-sm">{tenant?.slug}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t.settings.orgPlanLabel}</dt>
              <dd>
                <Badge variant="secondary">{(tenant as any).plan || 'N/A'}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t.settings.orgStatusLabel}</dt>
              <dd>
                <Badge
                  variant={tenant.status === "active" ? "default" : "destructive"}
                >
                  {tenant.status}
                </Badge>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground">{t.common.loading}</p>
        )}
      </CardContent>
    </Card>
  );
}
