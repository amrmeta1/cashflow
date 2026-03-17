"use client";

import { useState, useCallback } from "react";
import { Wand2, BarChart2, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { MatchRow } from "@/components/operations/reconciliation/MatchRow";
import { MATCH_PAIRS, type MatchPair } from "@/components/operations/reconciliation/types";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";

  const [pairs, setPairs] = useState<MatchPair[]>(MATCH_PAIRS);

  const handleApprove = useCallback((id: string) => {
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p))
    );
  }, []);

  const handleReject = useCallback((id: string) => {
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rejected" } : p))
    );
  }, []);

  function handleAutoApprove() {
    setPairs((prev) =>
      prev.map((p) => (p.confidence >= 99 ? { ...p, status: "approved" } : p))
    );
  }

  const kpis = [
    {
      label: { en: "Unreconciled Bank Txns", ar: "معاملات غير مطابقة" },
      value: "24",
      sub: { en: "Pending manual review", ar: "بانتظار المراجعة" },
      icon: BarChart2,
      valueClass: "text-foreground",
    },
    {
      label: { en: "Total Value Pending", ar: "إجمالي القيمة المعلقة" },
      value: "SAR 452k",
      sub: { en: "Across all open items", ar: "عبر جميع البنود المفتوحة" },
      icon: BarChart2,
      valueClass: "text-amber-600 dark:text-amber-400",
    },
    {
      label: { en: "AI Confidence Score", ar: "درجة ثقة AI" },
      value: "96%",
      sub: { en: "Average across all matches", ar: "متوسط جميع المطابقات" },
      icon: Sparkles,
      valueClass: "text-blue-600 dark:text-blue-400",
    },
    {
      label: { en: "Time Saved This Month", ar: "الوقت الموفر هذا الشهر" },
      value: isAr ? "18 ساعة" : "18 Hours",
      sub: { en: "vs. manual reconciliation", ar: "مقارنةً بالمطابقة اليدوية" },
      icon: Clock,
      valueClass: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-5xl w-full mx-auto px-4 py-8 space-y-8">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isAr ? "المطابقة البنكية بالذكاء الاصطناعي" : "AI Bank Reconciliation"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "مطابقة تلقائية لكشوف الحساب البنكية مع دفتر الأستاذ — بدقة تصل إلى 99%."
              : "Automatically match raw bank statement lines with your accounting ledger — up to 99% accuracy."}
          </p>
        </div>

        {/* ── AI Command Center Banner ── */}
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-5 flex items-start sm:items-center flex-col sm:flex-row gap-4">
          <Wand2 className="text-blue-600 dark:text-blue-400 w-6 h-6 animate-pulse shrink-0" />
          <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed flex-1">
            {isAr ? (
              <>
                <span className="font-semibold text-blue-950 dark:text-blue-100">مستشار AI:</span>{" "}
                تمت معالجة{" "}
                <span className="font-bold">342 معاملة بنكية</span>{" "}
                في{" "}
                <span className="font-bold">1.2 ثانية</span>.{" "}
                تم إيجاد{" "}
                <span className="font-bold">318 تطابقاً دقيقاً</span>{" "}
                (نسبة أتمتة 93%).{" "}
                <span className="font-bold text-amber-700 dark:text-amber-400">24 معاملة</span>{" "}
                تتطلب مراجعة يدوية.
              </>
            ) : (
              <>
                <span className="font-semibold text-blue-950 dark:text-blue-100">Mustashar AI</span>{" "}
                processed{" "}
                <span className="font-bold">342 bank transactions</span>{" "}
                in{" "}
                <span className="font-bold">1.2 seconds</span>.
                Found{" "}
                <span className="font-bold">318 exact matches</span>{" "}
                (93% automation rate).{" "}
                <span className="font-bold text-amber-700 dark:text-amber-400">24 transactions</span>{" "}
                require manual review.
              </>
            )}
          </p>
          <Button
            size="sm"
            onClick={handleAutoApprove}
            className="ms-auto shrink-0 gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-0"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isAr ? "✨ موافقة تلقائية على تطابقات 99%" : "✨ Auto-Approve 99% Matches"}
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
                    <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-tight">
                      {kpi.label[isAr ? "ar" : "en"]}
                    </CardTitle>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
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

        {/* ── Match List ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              {isAr ? "المطابقات المقترحة من AI" : "AI Suggested Matches"}
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {pairs.filter((p) => p.status === "pending").length}{" "}
              {isAr ? "بانتظار المراجعة" : "pending review"}
            </span>
          </div>

          <div className="flex flex-col gap-6">
            {pairs.map((pair) => (
              <MatchRow
                key={pair.id}
                pair={pair}
                isAr={isAr}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
