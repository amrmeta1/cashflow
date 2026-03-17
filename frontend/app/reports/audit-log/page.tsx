"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { listAuditLogs } from "@/lib/api/enterprise-api";
import { getMockAuditLogs } from "@/lib/mocks/mock-data";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/shared/ui/badge";
import { Card, CardContent } from "@/components/shared/ui/card";
import { RouteGuard } from "@/components/shared/layout/route-guard";

function AuditPageContent() {
  const { t, locale } = useI18n();
  const { currentTenant } = useTenant();
  const loc = locale === "ar" ? "ar-SA" : "en-SA";
  const isDemo = currentTenant?.id === "demo";

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", currentTenant?.id],
    queryFn: () =>
      isDemo ? Promise.resolve({ data: getMockAuditLogs(), meta: { total: 3, limit: 50, offset: 0 } }) : listAuditLogs(50, 0),
    enabled: !!currentTenant,
  });

  const logs = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5" />
        <h1 className="text-2xl font-bold tracking-tight">{t.audit.title}</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t.audit.noLogs}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-start font-medium">{t.audit.timestamp}</th>
                    <th className="px-4 py-3 text-start font-medium">{t.audit.action}</th>
                    <th className="px-4 py-3 text-start font-medium">{t.audit.actor}</th>
                    <th className="px-4 py-3 text-start font-medium">{t.audit.entity}</th>
                    <th className="px-4 py-3 text-start font-medium">{t.audit.ipAddress}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {formatDate(log.occurred_at, loc)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {log.actor_sub.substring(0, 12)}...
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.entity_type}/{log.entity_id?.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {log.ip_address}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditPage() {
  return (
    <RouteGuard allowedRoles={["tenant_admin", "owner"]}>
      <AuditPageContent />
    </RouteGuard>
  );
}
