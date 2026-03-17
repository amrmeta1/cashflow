"use client";

import { useState } from "react";
import { ArrowRightLeft, Building2, ChevronDown, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { useCurrency } from "@/contexts/CurrencyContext";

// ── Types & mock data ──────────────────────────────────────────────────────────

type EntityStatus = "risk" | "watch" | "stable";

interface Subsidiary {
  id: string;
  sector: string;
  status: EntityStatus;
  runway: string;
  balance: number;
}

function getStatusMeta(isAr: boolean): Record<EntityStatus, {
  dot: string; label: string; selectedCls: string; badgeCls: string;
}> {
  return {
    risk:   { dot: "🔴", label: isAr ? "عجز وشيك" : "Imminent Deficit",  selectedCls: "bg-red-500/5 border-s-4 border-s-red-500",          badgeCls: "border-destructive/40 bg-destructive/5 text-destructive" },
    watch:  { dot: "🟡", label: isAr ? "انتباه" : "Watch",               selectedCls: "bg-orange-500/5 border-s-4 border-s-orange-400",    badgeCls: "border-orange-400/40 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400" },
    stable: { dot: "🟢", label: isAr ? "مستقر" : "Stable",               selectedCls: "hover:bg-muted/50 border-s-4 border-s-transparent", badgeCls: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" },
  };
}

function buildEntities(name: string, isAr: boolean): Subsidiary[] {
  return [
    { id: "1", sector: isAr ? `${name} - قطاع المقاولات` : `${name} - Contracting`,   status: "risk",   runway: isAr ? "يكفي لـ 14 يوم فقط" : "14 days remaining", balance: -45_000    },
    { id: "2", sector: isAr ? `${name} - قطاع التجزئة` : `${name} - Retail`,           status: "stable", runway: isAr ? "يكفي لـ 8 أشهر" : "8 months remaining",     balance: 3_400_000  },
    { id: "3", sector: isAr ? `${name} - قطاع التقنية` : `${name} - Technology`,       status: "stable", runway: isAr ? "يكفي لـ 14 شهر" : "14 months remaining",    balance: 5_200_000  },
    { id: "4", sector: isAr ? `${name} - قطاع العقارات` : `${name} - Real Estate`,     status: "watch",  runway: isAr ? "يكفي لـ 6 أسابيع" : "6 weeks remaining",    balance: 820_000    },
    { id: "5", sector: isAr ? `${name} - قطاع اللوجستيات` : `${name} - Logistics`,     status: "stable", runway: isAr ? "يكفي لـ 11 شهر" : "11 months remaining",    balance: 2_180_000  },
  ];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HQHubPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { fmt, selected: curr } = useCurrency();
  const companyName = isAr ? "المجموعة" : "The Group";

  const STATUS_META = getStatusMeta(isAr);
  const ENTITIES = buildEntities(companyName, isAr);
  const [selectedId, setSelectedId] = useState<string>("1");
  const selected = ENTITIES.find((e) => e.id === selectedId) ?? ENTITIES[0];
  const selMeta = STATUS_META[selected.status];
  const topBorderCls =
    selected.status === "risk"  ? "border-t-red-500" :
    selected.status === "watch" ? "border-t-orange-400" :
                                  "border-t-emerald-500";

  return (
    <div dir={dir} className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-6 w-full max-w-[1800px] mx-auto overflow-hidden p-5 md:p-6">

      {/* ══ RIGHT PANE — Master Subsidiaries List ══ */}
      <div className="flex-[3] flex flex-col gap-4 overflow-y-auto min-w-0 pb-4 pe-2">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500 shrink-0" />
            <h1 className="text-2xl font-bold tracking-tight">
              {isAr ? "المركز الرئيسي للمجموعة" : "Group Headquarters"}{" "}
              {isAr && <span className="text-muted-foreground font-normal text-lg">(Group HQ)</span>}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1" suppressHydrationWarning>
            {isAr ? `مجموعة ${companyName} القابضة` : `${companyName} Holding Group`}
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="rounded-lg border bg-card p-3 min-w-[170px]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{isAr ? "السيولة المجمعة" : "Total Liquidity"}</p>
              <p className="text-lg font-bold tabular-nums text-foreground" suppressHydrationWarning>{fmt(18_450_000)}</p>
              <div className="text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md text-xs font-medium w-fit mt-1.5">{isAr ? "موزعة على 5 فروع" : "Across 5 branches"}</div>
            </div>
            <div className="rounded-lg border bg-card p-3 min-w-[150px]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{isAr ? "شركات في خطر" : "At Risk"}</p>
              <p className="text-lg font-bold tabular-nums text-destructive flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />{isAr ? "1 فرع" : "1 Branch"}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3 min-w-[170px]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{isAr ? "فائض متاح" : "Available Surplus"}</p>
              <p className="text-lg font-bold tabular-nums text-foreground" suppressHydrationWarning>{fmt(2_100_000)}</p>
              <div className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md text-xs font-medium w-fit mt-1.5 flex items-center gap-1">{isAr ? "↗ متاح للتحويل" : "↗ Available for Transfer"}</div>
            </div>
          </div>
        </div>

        {/* Subsidiaries list card */}
        <Card className="flex-1 overflow-hidden flex flex-col shadow-sm border-border/50">
          <div className="flex items-center gap-2 p-3 border-b shrink-0">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0">
              {isAr ? "حالة السيولة" : "Liquidity Status"} <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0">
              {isAr ? "ترتيب حسب الرصيد" : "Sort by Balance"} <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {ENTITIES.map((entity) => {
              const isSelected = entity.id === selectedId;
              const meta = STATUS_META[entity.status];
              const isNeg = entity.balance < 0;
              return (
                <div
                  key={entity.id}
                  onClick={() => setSelectedId(entity.id)}
                  className={`p-4 border-b cursor-pointer flex justify-between items-center transition-colors gap-4 ${
                    isSelected ? meta.selectedCls : "hover:bg-muted/50 border-s-4 border-s-transparent"
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border w-fit ${meta.badgeCls}`}>
                      {meta.dot} {meta.label}
                    </span>
                    <p className="text-sm font-semibold truncate" suppressHydrationWarning>{entity.sector}</p>
                    <p className="text-[11px] text-muted-foreground">{entity.runway}</p>
                  </div>
                  <p className={`text-sm font-bold tabular-nums shrink-0 ${isNeg ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`} suppressHydrationWarning>
                    <span dir="ltr">{fmt(entity.balance)}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ══ LEFT PANE — Subsidiary Detail + AI Copilot ══ */}
      <div className="flex-[2] flex flex-col gap-4 border-s border-border/50 ps-6 overflow-y-auto min-w-0 pb-4">

        {/* Subsidiary context card */}
        <Card className={`p-5 shadow-sm border-border/50 shrink-0 border-t-4 ${topBorderCls}`}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold" suppressHydrationWarning>
            {isAr ? "فرع" : "Branch"}: {selected.sector}
          </p>
          <p className={`text-3xl font-bold tabular-nums mt-2 ${selected.balance < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`} suppressHydrationWarning>
            <span dir="ltr">{fmt(selected.balance)}</span>
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${selMeta.badgeCls}`}>
              {selMeta.dot} {selMeta.label} — {selected.runway}
            </span>
          </div>
          {selected.status === "risk" && (
            <p className="text-xs text-destructive mt-2 font-medium">
              {isAr ? "🔴 عجز متوقع بعد 14 يوم لسداد الرواتب (Expected Payroll Shortfall)" : "🔴 Expected payroll shortfall in 14 days"}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div><p className="font-medium text-foreground">{isAr ? "القطاع" : "Sector"}</p><p>{isAr ? "المقاولات والبنية التحتية" : "Contracting & Infrastructure"}</p></div>
            <div><p className="font-medium text-foreground">{isAr ? "البنك" : "Bank"}</p><p>{isAr ? "QNB — الجاري" : "QNB — Current"}</p></div>
            <div><p className="font-medium text-foreground">{isAr ? "آخر تحديث" : "Last Updated"}</p><p>{isAr ? "اليوم، 02:14 ص" : "Today, 02:14 AM"}</p></div>
            <div><p className="font-medium text-foreground">{isAr ? "العملة" : "Currency"}</p><p suppressHydrationWarning>{curr}</p></div>

          </div>
        </Card>

        {/* AI Inter-Company Transfer Copilot */}
        <Card className="flex-1 p-6 bg-indigo-900/10 border-indigo-500/20 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <div>
              <p className="text-sm font-bold">{isAr ? "خطة الإنقاذ من الوكيل مُستشار" : "Agent Rescue Plan"}</p>
              <p className="text-[10px] text-muted-foreground">Inter-Company Rescue Plan</p>
            </div>
            <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold px-2 py-0.5">
              <Sparkles className="h-2.5 w-2.5" />AI
            </span>
          </div>

          <div className="rounded-lg bg-white/60 dark:bg-white/5 border border-indigo-100 dark:border-indigo-900/50 p-4">
            <p className="text-sm text-foreground leading-relaxed" suppressHydrationWarning>
              {isAr ? (
                <>
                  قطاع المقاولات سيواجه عجزاً بقيمة <strong>{fmt(45_000)}</strong> لسداد الرواتب.
                  في المقابل، يمتلك <strong>(قطاع التجزئة)</strong> فائضاً نقدياً غير مستغل بقيمة{" "}
                  <strong>{fmt(2_100_000)}</strong> في بنك QNB. أنصح بتنفيذ تحويل داخلي
                  (Inter-company Loan) لتجنب السحب على المكشوف وتوفير 7% فوائد بنكية.
                </>
              ) : (
                <>
                  The Contracting sector faces a <strong>{fmt(45_000)}</strong> payroll shortfall.
                  Meanwhile, the <strong>Retail sector</strong> holds an unused cash surplus of{" "}
                  <strong>{fmt(2_100_000)}</strong> at QNB. We recommend an inter-company loan
                  to avoid overdraft and save 7% in bank interest.
                </>
              )}
            </p>
          </div>

          {/* Visual transfer schema */}
          <div className="flex items-center justify-center gap-3 rounded-lg bg-white/60 dark:bg-white/5 border border-indigo-100 dark:border-indigo-900/50 p-3 flex-wrap">
            <span className="rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-2.5 py-1.5 border border-emerald-300 dark:border-emerald-800">
              {isAr ? "فرع التجزئة" : "Retail Branch"}
            </span>
            <ArrowRightLeft className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-xs font-bold px-2.5 py-1.5 border border-indigo-300 dark:border-indigo-800 tabular-nums" suppressHydrationWarning>
              {fmt(45_000)}
            </span>
            <ArrowRightLeft className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="rounded-md bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-semibold px-2.5 py-1.5 border border-red-300 dark:border-red-800">
              {isAr ? "فرع المقاولات" : "Contracting Branch"}
            </span>
          </div>

          {selected.status === "risk" && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed" suppressHydrationWarning>
                {isAr
                  ? `تحذير: بدون تدخل فوري، سيتجاوز الرصيد حد السحب على المكشوف المصرح به (${fmt(100_000)}) خلال 14 يوماً.`
                  : `Warning: Without immediate action, the balance will exceed the authorized overdraft limit (${fmt(100_000)}) within 14 days.`}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-auto">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2" size="sm" suppressHydrationWarning>
              {isAr ? `⚡ تنفيذ تحويل داخلي بقيمة ${fmt(50_000)}` : `⚡ Execute Internal Transfer — ${fmt(50_000)}`}
            </Button>
            <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/5 gap-2" size="sm">
              {isAr ? "طلب تسهيلات ائتمانية من البنك" : "Request Bank Credit Facility"}
            </Button>
            <Button variant="outline" className="w-full gap-2" size="sm">
              {isAr ? "عرض التفاصيل المالية للفرع" : "View Branch Financial Details"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
