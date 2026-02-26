"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useCashPosition } from "@/lib/hooks/useCashPosition";
import { useTransactions } from "@/features/transactions/hooks";
import { useCommandMenu } from "@/lib/command-store";
import type { CashPositionExplanation } from "@/features/cash-position/types";
import { CashPositionExplanationPanel } from "@/components/cash-position/CashPositionExplanationPanel";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 260;

const AGENTS = [
  { id: "raqib", nameEn: "Raqib", nameAr: "رقيب", roleEn: "Monitoring", roleAr: "المراقبة", badge: "Live", dotClass: "bg-emerald-500", badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", ping: true },
  { id: "mutawaqi", nameEn: "Mutawaqi'", nameAr: "متوقّع", roleEn: "Forecasting", roleAr: "التنبؤ", badge: "94% Acc", dotClass: "bg-blue-500", badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400", ping: false },
  { id: "mustashar", nameEn: "Mustashar", nameAr: "مستشار", roleEn: "Advisor", roleAr: "المستشار", badge: "Ready", dotClass: "bg-amber-500", badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400", ping: false },
];

const QUICK_LINKS: { href: string; navKey: "projectCashFlow" | "groupConsolidation" | "riskRadar" | "alerts" | "reports" }[] = [
  { href: "/app/project-cash-flow", navKey: "projectCashFlow" },
  { href: "/app/group-consolidation", navKey: "groupConsolidation" },
  { href: "/app/risk-radar", navKey: "riskRadar" },
  { href: "/app/alerts", navKey: "alerts" },
  { href: "/app/reports", navKey: "reports" },
];

export function DashboardRightSidebar() {
  const { t, locale, dir } = useI18n();
  const { fmt } = useCurrency();
  const { currentTenant } = useTenant();
  const { totalBalance, isLoading, data } = useCashPosition(currentTenant?.id);
  const { data: txList } = useTransactions(currentTenant?.id);
  const { open: openCommandPalette } = useCommandMenu();
  const [explainOpen, setExplainOpen] = useState(false);
  const isAr = locale === "ar";
  const d = t.dashboard;
  const nav = t.nav;

  const totalCash = totalBalance;
  const hasCashData = (data?.accounts?.length ?? 0) > 0;
  const primaryCurrency = data?.totals?.byCurrency?.[0]?.currency ?? "SAR";
  const explanation: CashPositionExplanation | null = useMemo(() => {
    if (!data) return null;
    const composition = (data.accounts ?? []).map((a) => ({
      accountId: a.accountId,
      name: a.name,
      currency: a.currency,
      balance: a.balance,
    }));
    const recentTransactions = (txList ?? []).slice(0, 5).map((t) => ({
      id: t.id,
      description: t.description || t.counterparty?.name || "—",
      amount: t.amount,
      date: t.txn_date || t.created_at,
    }));
    return {
      totalCash: totalBalance,
      primaryCurrency,
      composition,
      recentTransactions,
    };
  }, [data, txList, totalBalance, primaryCurrency]);
  const healthMonths = 8.3;

  return (
    <aside
      dir={dir}
      className="hidden xl:flex flex-col w-[var(--dashboard-sidebar-width)] shrink-0 pl-5 border-s border-border/40"
      style={{ ["--dashboard-sidebar-width" as string]: `${SIDEBAR_WIDTH}px` }}
    >
      <div className="space-y-5 py-0.5">
        {/* 1. AI Agents — top & most prominent */}
        <div className="space-y-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {d.aiAgents}
          </h3>
          <div className="space-y-1">
            {AGENTS.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md border border-border/40 bg-card/50 px-2.5 py-2",
                  "hover:border-border/80 hover:shadow-[0_0_12px_rgba(16,185,129,0.08)] transition-all duration-200"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    {a.ping && (
                      <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-50", a.dotClass)} />
                    )}
                    <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", a.dotClass)} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{isAr ? a.nameAr : a.nameEn}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{isAr ? a.roleAr : a.roleEn}</p>
                  </div>
                </div>
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium", a.badgeClass)}>
                  {a.badge}
                </span>
              </div>
            ))}
          </div>
          <Button
            onClick={openCommandPalette}
            className="w-full h-9 rounded-lg font-semibold text-xs bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200"
          >
            <Sparkles className="h-3.5 w-3.5 me-1.5" />
            {isAr ? "اسأل مستشار" : "Ask Mustashar"}
          </Button>
        </div>

        {/* 2. Liquidity Summary — compact */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {isAr ? "ملخص السيولة" : "Liquidity Summary"}
          </h3>
          <Card className="border-border/40 shadow-none bg-muted/20">
            <CardContent className="p-3 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                  {d.cashPosition}
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-24 mt-0.5" />
                ) : !hasCashData ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.noCashData}
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-bold tabular-nums tracking-tight text-foreground">
                      {fmt(totalCash)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setExplainOpen(true)}
                      className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-0.5"
                      aria-label={isAr ? "شرح هذا الرقم" : "Explain this"}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="border-t border-border/40 pt-2.5">
                <Link href="/app/cash-positioning" className="text-[10px] text-muted-foreground hover:text-foreground hover:underline">
                  {d.viewFullCashPosition}
                </Link>
              </div>
              <div className="border-t border-border/40 pt-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                  {nav.forecast13w}
                </p>
                <Link
                  href="/app/forecast"
                  className="text-xs font-medium text-primary hover:text-primary/90 hover:underline inline-flex items-center gap-1"
                >
                  {isAr ? "عرض التوقعات" : "View forecast"}
                  <ArrowRight className={cn("h-3 w-3", isAr && "rotate-180")} />
                </Link>
              </div>
              <div className="border-t border-border/40 pt-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                  {d.runway}
                </p>
                <p className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {healthMonths} {d.runwayMonths}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Quick Links — max 5, text-only, subtle hover */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {isAr ? "روابط سريعة" : "Quick Links"}
          </h3>
          <nav className="space-y-0.5">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  "hover:shadow-[0_0_10px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_0_10px_rgba(255,255,255,0.04)] transition-all duration-150"
                )}
              >
                <span className="truncate">{nav[item.navKey]}</span>
                <ArrowRight className={cn("h-3 w-3 shrink-0 opacity-40", isAr && "rotate-180")} />
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <CashPositionExplanationPanel
        open={explainOpen}
        onOpenChange={setExplainOpen}
        explanation={explanation}
        loading={isLoading}
        isAr={isAr}
      />
    </aside>
  );
}
