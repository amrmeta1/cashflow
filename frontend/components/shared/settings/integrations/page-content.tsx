"use client";

import { CheckCircle2, Clock, AlertCircle, RefreshCw, Plus, Link2 } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";
import { Switch } from "@/components/shared/ui/switch";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import {
  useIntegrations,
  useToggleIntegration,
  useSyncIntegration,
  useConnectIntegration,
} from "./hooks";
import type { IntegrationCategory, IntegrationStatus } from "./types";

const STATUS_CONFIG: Record<
  IntegrationStatus,
  { icon: typeof CheckCircle2; labelEn: string; labelAr: string; cls: string }
> = {
  connected:    { icon: CheckCircle2, labelEn: "Connected",    labelAr: "متصل",        cls: "text-green-600" },
  disconnected: { icon: AlertCircle,  labelEn: "Disconnected", labelAr: "غير متصل",    cls: "text-muted-foreground" },
  coming_soon:  { icon: Clock,        labelEn: "Coming Soon",  labelAr: "قريبًا",       cls: "text-muted-foreground" },
  error:        { icon: AlertCircle,  labelEn: "Error",        labelAr: "خطأ",          cls: "text-red-600" },
};

const CATEGORY_LABELS: Record<IntegrationCategory, { en: string; ar: string }> = {
  import:     { en: "Data Import",        ar: "استيراد البيانات" },
  bank:       { en: "Bank Connections",   ar: "الاتصالات البنكية" },
  accounting: { en: "Accounting Software", ar: "برامج المحاسبة" },
};

const CATEGORIES: IntegrationCategory[] = ["import", "bank", "accounting"];

interface IntegrationsPageContentProps {
  tenantId?: string;
  isAr: boolean;
  locale: string;
}

export function IntegrationsPageContent({
  tenantId,
  isAr,
  locale,
}: IntegrationsPageContentProps) {
  const { data: integrations = [], isLoading } = useIntegrations(tenantId);
  const { mutate: toggle } = useToggleIntegration(tenantId);
  const { mutate: sync, isPending: isSyncing, variables: syncingId } = useSyncIntegration(tenantId);
  const { mutate: connect, isPending: isConnecting, variables: connectingId } = useConnectIntegration(tenantId);

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      {CATEGORIES.map((cat) => {
        const catItems = integrations.filter((i) => i.category === cat);
        const label = CATEGORY_LABELS[cat];

        return (
          <section key={cat}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {isAr ? label.ar : label.en}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {isLoading
                ? [1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-md" />)
                : catItems.map((intg) => {
                    const stat = STATUS_CONFIG[intg.status];
                    const StatIcon = stat.icon;
                    const isComingSoon = intg.status === "coming_soon";
                    const isConnected = intg.status === "connected";
                    const isDisconnected = intg.status === "disconnected";
                    const isSyncingThis = isSyncing && syncingId === intg.id;
                    const isConnectingThis = isConnecting && connectingId === intg.id;

                    return (
                      <div
                        key={intg.id}
                        className={cn(
                          "rounded-md border bg-card p-4 flex flex-col gap-3",
                          isComingSoon && "opacity-60"
                        )}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl leading-none">{intg.logo}</span>
                            <div>
                              <p className="text-sm font-semibold leading-tight">
                                {isAr ? intg.name_ar : intg.name_en}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <StatIcon className={cn("h-3 w-3", stat.cls)} />
                                <span className={cn("text-xs", stat.cls)}>
                                  {isAr ? stat.labelAr : stat.labelEn}
                                </span>
                              </div>
                            </div>
                          </div>
                          {isConnected && (
                            <Switch
                              checked={intg.enabled}
                              onCheckedChange={(v) => toggle({ id: intg.id, enabled: v })}
                              aria-label={isAr ? "تفعيل/تعطيل التكامل" : "Toggle integration"}
                            />
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                          {isAr ? intg.description_ar : intg.description_en}
                        </p>

                        {/* Last sync */}
                        {intg.last_sync_at && (
                          <p className="text-xs text-muted-foreground">
                            {isAr ? "آخر مزامنة:" : "Last sync:"}{" "}
                            <span className="tabular">{formatDate(intg.last_sync_at, locale)}</span>
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-auto">
                          {isComingSoon && (
                            <Badge variant="outline" className="text-xs">
                              {isAr ? "قريبًا" : "Coming Soon"}
                            </Badge>
                          )}
                          {isConnected && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-7 text-xs gap-1"
                              disabled={isSyncingThis}
                              onClick={() => sync(intg.id)}
                            >
                              <RefreshCw className={cn("h-3 w-3", isSyncingThis && "animate-spin")} />
                              {isSyncingThis
                                ? (isAr ? "جارٍ..." : "Syncing…")
                                : (isAr ? "مزامنة" : "Sync now")}
                            </Button>
                          )}
                          {isDisconnected && (
                            <Button
                              size="sm"
                              className="flex-1 h-7 text-xs gap-1"
                              disabled={isConnectingThis}
                              onClick={() => connect(intg.id)}
                            >
                              <Plus className="h-3 w-3" />
                              {isConnectingThis
                                ? (isAr ? "جارٍ الاتصال..." : "Connecting…")
                                : (isAr ? "اتصال" : "Connect")}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
