"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Clock as ClockIcon,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useToast } from "@/components/shared/ui/toast";
import { getAlert, acknowledgeAlert, resolveAlert } from "@/lib/api/reports-api";
import { formatDate } from "@/lib/utils";

const severityConfig = {
  high: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950" },
  medium: { icon: AlertCircle, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-950" },
  low: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950" },
};

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const alertId = params.alertId as string;

  const { data, isLoading } = useQuery({
    queryKey: ["alert", currentTenant?.id, alertId],
    queryFn: () => getAlert(currentTenant!.id, alertId),
    enabled: !!currentTenant && !!alertId,
  });

  const ackMutation = useMutation({
    mutationFn: () => acknowledgeAlert(currentTenant!.id, alertId),
    onSuccess: () => {
      toast({ title: t.alerts.acknowledged, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["alert", currentTenant?.id, alertId] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: () => resolveAlert(currentTenant!.id, alertId),
    onSuccess: () => {
      toast({ title: t.alerts.resolved, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["alert", currentTenant?.id, alertId] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  const alert = data?.data;
  if (!alert) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t.common.error}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/reports/alerts")}>
          {t.alerts.backToAlerts}
        </Button>
      </div>
    );
  }

  const sev = severityConfig[alert.severity as keyof typeof severityConfig];
  const SevIcon = sev.icon;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/reports/alerts")}>
        <ArrowLeft className="me-2 h-4 w-4" />
        {t.alerts.backToAlerts}
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${sev.bg}`}>
          <SevIcon className={`h-6 w-6 ${sev.color}`} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{alert.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant={alert.severity === "high" ? "destructive" : "secondary"}>
              {t.alerts[alert.severity as keyof typeof t.alerts]}
            </Badge>
            <Badge variant="outline">
              {t.alerts[alert.status as keyof typeof t.alerts]}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {formatDate(alert.created_at, locale === "ar" ? "ar-SA" : "en-SA")}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm">{alert.description}</p>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.alerts.explanation}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{alert.explanation}</p>
        </CardContent>
      </Card>

      {/* Recommended Action */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.alerts.recommendedAction}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{alert.recommended_action}</p>
        </CardContent>
      </Card>

      {/* Related Items */}
      {alert.related_entities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.alerts.relatedItems}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alert.related_entities?.map((entity: { type: string; id: string }, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="capitalize">{entity.type}</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    {entity.id}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {alert.status !== "resolved" && (
        <div className="flex gap-3">
          {alert.status === "open" && (
            <Button
              variant="outline"
              onClick={() => ackMutation.mutate()}
              disabled={ackMutation.isPending}
            >
              <Eye className="me-2 h-4 w-4" />
              {t.alerts.acknowledge}
            </Button>
          )}
          <Button
            onClick={() => resolveMutation.mutate()}
            disabled={resolveMutation.isPending}
          >
            <CheckCircle2 className="me-2 h-4 w-4" />
            {t.alerts.resolve}
          </Button>
          <Button variant="ghost">
            <ClockIcon className="me-2 h-4 w-4" />
            {t.alerts.snooze}
          </Button>
        </div>
      )}
    </div>
  );
}
