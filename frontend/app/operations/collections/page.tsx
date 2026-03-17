"use client";

import { useState } from "react";
import { MessageCircle, TrendingUp, Clock, BarChart2 } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AgingBoard } from "@/components/operations/collections/AgingBoard";
import { WhatsAppDialog } from "@/components/operations/collections/WhatsAppDialog";
import { RECEIVABLES, type Receivable } from "@/components/operations/collections/types";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CashCollectPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { fmt } = useCurrency();

  const [selected, setSelected] = useState<Receivable | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleGenerate(r: Receivable) {
    setSelected(r);
    setDialogOpen(true);
  }

  // Derived KPIs from mock data
  const totalReceivables = RECEIVABLES.reduce((s, r) => s + r.amount, 0);
  const severelyOverdue = RECEIVABLES.filter(
    (r) => r.status === "overdue_31_60" || r.status === "overdue_90"
  ).reduce((s, r) => s + r.amount, 0);

  const kpis = [
    {
      label: { en: "Total Receivables", ar: "إجمالي المستحقات" },
      value: fmt(totalReceivables),
      sub: { en: "Across all clients", ar: "عبر جميع العملاء" },
      icon: BarChart2,
      valueClass: "text-foreground",
    },
    {
      label: { en: "Severely Overdue >30d", ar: "متأخرة بشدة +٣٠ يوم" },
      value: fmt(severelyOverdue),
      sub: { en: "Requires immediate action", ar: "يتطلب إجراءً فورياً" },
      icon: Clock,
      valueClass: "text-destructive",
    },
    {
      label: { en: "AI Collection Probability", ar: "احتمالية التحصيل AI" },
      value: "82%",
      sub: { en: "Based on client payment history", ar: "بناءً على سجل دفع العميل" },
      icon: TrendingUp,
      valueClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: { en: "Avg DSO", ar: "متوسط أيام المبيعات" },
      value: isAr ? "٤٢ يوماً" : "42 Days",
      sub: { en: "Days Sales Outstanding", ar: "أيام المبيعات المعلقة" },
      icon: Clock,
      valueClass: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-7xl w-full mx-auto px-4 py-8 space-y-8">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isAr ? "التحصيل الذكي وتقادم الذمم المدينة" : "AI Smart CashCollect & AR Aging"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "تتبع الفواتير المتأخرة وأرسل رسائل تحصيل ذكية عبر واتساب بنقرة واحدة."
              : "Track overdue invoices and dispatch AI-drafted WhatsApp collection messages in one click."}
          </p>
        </div>

        {/* ── AI Action Banner ── */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-5 flex items-start sm:items-center flex-col sm:flex-row gap-4">
          <MessageCircle className="text-emerald-600 dark:text-emerald-400 w-6 h-6 animate-pulse shrink-0" />
          <p className="text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed flex-1">
            {isAr ? (
              <>
                <span className="font-semibold text-emerald-950 dark:text-emerald-100">تنبيه مستشار AI:</span>{" "}
                ٣ فواتير تتجاوز{" "}
                <span className="font-bold">{fmt(340_000)}</span>{" "}
                متأخرة بشكل حاد. تم إعداد{" "}
                <span className="font-bold">٣ رسائل واتساب ذكية</span>{" "}
                جاهزة للإرسال الفوري.
              </>
            ) : (
              <>
                <span className="font-semibold text-emerald-950 dark:text-emerald-100">Mustashar AI Insight:</span>{" "}
                3 invoices exceeding{" "}
                <span className="font-bold">{fmt(340_000)}</span>{" "}
                are severely overdue. Auto-drafted{" "}
                <span className="font-bold">3 context-aware WhatsApp messages</span>{" "}
                ready for dispatch.
              </>
            )}
          </p>
          <Button
            size="sm"
            className="ms-auto shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {isAr ? "⚡ إرسال جميع رسائل التحصيل" : "⚡ Auto-Send All WhatsApp Chasers"}
          </Button>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <Card key={i}>
                <CardHeader className="pb-1 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {kpi.label[isAr ? "ar" : "en"]}
                    </CardTitle>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className={`text-xl font-bold tabular-nums tracking-tighter ${kpi.valueClass}`}>
                    {kpi.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {kpi.sub[isAr ? "ar" : "en"]}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── AR Aging Board ── */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            {isAr ? "لوحة تقادم الذمم المدينة" : "AR Aging Board"}
          </h2>
          <AgingBoard isAr={isAr} onGenerate={handleGenerate} fmt={fmt} />
        </div>

      </div>

      {/* ── WhatsApp Dialog ── */}
      <WhatsAppDialog
        receivable={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isAr={isAr}
        fmt={fmt}
      />
    </div>
  );
}
