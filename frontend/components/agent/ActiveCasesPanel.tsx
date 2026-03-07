"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useI18n } from "@/lib/i18n/context";
import { DriversPopover } from "./DriversPopover";
import type { Alert } from "@/lib/api/alerts-api";

export type CaseSeverity = "High" | "Medium" | "Low";

export interface AgentCase {
  id: string;
  title: string;
  titleAr: string;
  severity: CaseSeverity;
  impactAmount: number;
  dueDate: string;
  drivers: { label: string; amount: number }[];
  recommendation: string;
  recommendationAr: string;
}

function mapAlertToCase(alert: Alert): AgentCase {
  const mapSeverity = (s: string): CaseSeverity => {
    const lower = s.toLowerCase();
    if (lower === "critical" || lower === "high") return "High";
    if (lower === "medium") return "Medium";
    return "Low";
  };

  return {
    id: alert.id,
    title: alert.title,
    titleAr: alert.title,
    severity: mapSeverity(alert.severity),
    impactAmount: 0,
    dueDate: alert.created_at,
    drivers: [{ label: alert.description, amount: 0 }],
    recommendation: alert.recommended_action,
    recommendationAr: alert.recommended_action,
  };
}

interface ActiveCasesPanelProps {
  alerts?: Alert[];
  loading?: boolean;
  selectedCase?: AgentCase | null;
  onSelectCase?: (c: AgentCase | null) => void;
}

export function ActiveCasesPanel({
  alerts = [],
  loading = false,
  selectedCase,
  onSelectCase,
}: ActiveCasesPanelProps) {
  const { fmt } = useCurrency();
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const cases = alerts.map(mapAlertToCase);

  const severityVariant = (s: CaseSeverity) => {
    if (s === "High") return "destructive";
    if (s === "Medium") return "default";
    return "secondary";
  };
  const severityLabel = (s: CaseSeverity) =>
    isAr ? (s === "High" ? "عالي" : s === "Medium" ? "متوسط" : "منخفض") : s;

  const formatDue = (d: string) =>
    new Date(d).toLocaleDateString(isAr ? "ar-SA" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-base font-semibold">
            {isAr ? "التنبيهات النشطة" : "Active Alerts"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50">
                <CardHeader className="pb-2 pt-4 px-4">
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cases.length === 0) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-base font-semibold">
            {isAr ? "التنبيهات النشطة" : "Active Alerts"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {isAr 
                ? "لا توجد مخاطر نشطة. كل شيء على ما يرام."
                : "All clear. No active treasury risks."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/50 h-full flex flex-col">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold">
          {isAr ? "التنبيهات النشطة" : "Active Alerts"}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 flex-1">
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 h-full content-start">
          {cases.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer border-border/50 hover:border-indigo-500/50 transition-colors"
              onClick={() => onSelectCase?.(c)}
            >
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xs font-medium leading-tight line-clamp-2">
                    {isAr ? c.titleAr : c.title}
                  </CardTitle>
                  <Badge variant={severityVariant(c.severity)} className="text-[9px] shrink-0 h-4 px-1.5">
                    {severityLabel(c.severity)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1.5 text-[11px]">
                <p className="text-muted-foreground line-clamp-2 leading-tight">
                  {isAr ? c.recommendationAr : c.recommendation}
                </p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDue(c.dueDate)}
                  </span>
                  <DriversPopover drivers={c.drivers}>
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2 -mr-2">
                      {isAr ? "تفاصيل" : "Details"}
                    </Button>
                  </DriversPopover>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
