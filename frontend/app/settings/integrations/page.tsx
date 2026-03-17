"use client";

import { useState } from "react";
import {
  Plug,
  Building2,
  BookOpen,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Integration {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  interactive?: boolean;
}

// ── Integration Card ───────────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  isAr,
  connecting,
  connected,
  onConnect,
}: {
  integration: Integration;
  isAr: boolean;
  connecting: string | null;
  connected: string[];
  onConnect: (key: string) => void;
}) {
  const isConnecting = connecting === integration.key;
  const isConnected = connected.includes(integration.key);

  return (
    <Card className="shadow-sm border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted shrink-0">
              {integration.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {integration.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {integration.description}
              </p>
            </div>
          </div>

          {isConnected ? (
            <Button
              size="sm"
              className="h-8 text-xs shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isAr ? "متصل · تزامن منذ دقيقتين" : "Connected · Synced 2 mins ago"}
            </Button>
          ) : isConnecting ? (
            <Button size="sm" variant="outline" className="h-8 text-xs shrink-0 gap-1.5" disabled>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isAr ? "جاري الربط..." : "Connecting..."}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs shrink-0 gap-1.5"
              onClick={() => integration.interactive && onConnect(integration.key)}
              disabled={!integration.interactive}
            >
              <Plug className="h-3.5 w-3.5" />
              {isAr ? "ربط الحساب" : "Connect"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { locale, dir } = useI18n();
  const { profile } = useCompany();
  const isAr = locale === "ar";

  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);

  const bankIntegrations: Integration[] = [
    {
      key: "qnb",
      name: isAr ? "بنك قطر الوطني" : "QNB",
      description: isAr ? "بنك قطر الوطني — واجهة Open Banking" : "Qatar National Bank — Open Banking API",
      icon: <Building2 className="h-6 w-6 text-indigo-600" />,
      interactive: true,
    },
    {
      key: "alrajhi",
      name: isAr ? "مصرف الراجحي" : "Al Rajhi Bank",
      description: isAr ? "مصرف الراجحي — واجهة Open Banking" : "Al Rajhi Bank — Open Banking API",
      icon: <Building2 className="h-6 w-6 text-emerald-600" />,
    },
    {
      key: "emiratesnbd",
      name: isAr ? "بنك الإمارات دبي الوطني" : "Emirates NBD",
      description: isAr ? "بنك الإمارات دبي الوطني — واجهة Open Banking" : "Emirates NBD — Open Banking API",
      icon: <Building2 className="h-6 w-6 text-rose-600" />,
    },
  ];

  const accountingIntegrations: Integration[] = [
    {
      key: "wafeq",
      name: isAr ? "وافق" : "Wafeq (وافق)",
      description: isAr ? "برنامج محاسبة مخصص لدول الخليج" : "GCC-native accounting software",
      icon: <BookOpen className="h-6 w-6 text-violet-600" />,
      interactive: true,
    },
    {
      key: "zoho",
      name: isAr ? "Zoho Books" : "Zoho Books",
      description: isAr ? "محاسبة سحابية للشركات الصغيرة والمتوسطة" : "Cloud accounting for SMEs",
      icon: <BookOpen className="h-6 w-6 text-orange-500" />,
    },
    {
      key: "quickbooks",
      name: isAr ? "QuickBooks Online" : "QuickBooks Online",
      description: isAr ? "المعيار العالمي للمحاسبة" : "Intuit QuickBooks — global standard",
      icon: <BookOpen className="h-6 w-6 text-green-600" />,
    },
  ];

  function handleConnect(key: string) {
    setConnecting(key);
    setTimeout(() => {
      setConnecting(null);
      setConnected((prev) => [...prev, key]);
    }, 2000);
  }

  return (
    <div dir={dir} className="flex flex-col gap-8 p-5 md:p-7 overflow-y-auto h-full">

      {/* ══ HEADER ══ */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          {isAr ? "مصادر البيانات والربط" : "Data Integrations"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr
            ? "اربط حساباتك البنكية والأنظمة المحاسبية لتفعيل وكلاء الذكاء الاصطناعي."
            : "Connect your bank accounts and accounting systems to activate AI agents."}
        </p>
      </div>

      {/* ══ SECTION 1 — Open Banking ══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">{isAr ? "الربط البنكي" : "Open Banking"}</h2>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1 font-medium">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            Secured by Lean Technologies &amp; Tarabut
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bankIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.key}
              integration={integration}
              isAr={isAr}
              connecting={connecting}
              connected={connected}
              onConnect={handleConnect}
            />
          ))}
        </div>
      </section>

      {/* ══ SECTION 2 — Accounting Sync ══ */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">{isAr ? "الأنظمة المحاسبية" : "Accounting Sync"}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accountingIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.key}
              integration={integration}
              isAr={isAr}
              connecting={connecting}
              connected={connected}
              onConnect={handleConnect}
            />
          ))}
        </div>
      </section>

    </div>
  );
}
