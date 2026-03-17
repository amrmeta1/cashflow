"use client";

import { useState } from "react";
import { Search, ChevronDown, MessageCircle, Sparkles, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Card, CardContent } from "@/components/shared/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { useCurrency } from "@/contexts/CurrencyContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  vendor: string;
  invoice: string;
  due: string;
  amount: number;
  priority: "urgent" | "delay" | "discount";
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PayablesPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { profile } = useCompany();
  void profile;
  const { fmt, selected: currCode } = useCurrency();
  const [selectedId, setSelectedId] = useState<string>("1");

  const INVOICES: Invoice[] = [
    { id: "1", vendor: "Ooredoo",           invoice: "INV-2026-089", due: isAr ? "غداً" : "Tomorrow",       amount: 45_000,  priority: "urgent"   },
    { id: "2", vendor: "Al Mana Motors",    invoice: "INV-2026-074", due: isAr ? "15 أكتوبر" : "Oct 15",    amount: 128_000, priority: "delay"    },
    { id: "3", vendor: "Microsoft Ireland", invoice: "INV-2026-101", due: isAr ? "20 أكتوبر" : "Oct 20",    amount: 32_500,  priority: "discount" },
    { id: "4", vendor: "Aramex",            invoice: "INV-2026-055", due: isAr ? "22 أكتوبر" : "Oct 22",    amount: 18_750,  priority: "delay"    },
    { id: "5", vendor: "STC Business",      invoice: "INV-2026-112", due: isAr ? "28 أكتوبر" : "Oct 28",    amount: 67_200,  priority: "urgent"   },
    { id: "6", vendor: "Oracle Cloud",      invoice: "INV-2026-098", due: isAr ? "1 نوفمبر" : "Nov 1",      amount: 215_000, priority: "discount" },
    { id: "7", vendor: "Zain Business",     invoice: "INV-2026-063", due: isAr ? "5 نوفمبر" : "Nov 5",      amount: 41_050,  priority: "delay"    },
  ];

  const PRIORITY_META = {
    urgent:   { dot: "🔴", label: isAr ? "عاجل جداً" : "Urgent",             color: "text-destructive"                       },
    delay:    { dot: "🟡", label: isAr ? "تأجيل ممكن" : "Can Delay",          color: "text-orange-500 dark:text-orange-400"   },
    discount: { dot: "🟢", label: isAr ? "خصم متاح" : "Discount Available",   color: "text-emerald-600 dark:text-emerald-400" },
  };

  const selected = INVOICES.find((inv) => inv.id === selectedId) ?? INVOICES[0];

  return (
    <div
      dir={dir}
      className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-6 w-full max-w-[1800px] mx-auto overflow-hidden p-5 md:p-6"
    >

      {/* ══════════════════════════════════════════════════════════════════════
          RIGHT PANE — Master Invoice List
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-[3] flex flex-col gap-4 overflow-y-auto min-w-0 pb-4 pe-2">

        {/* A. Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAr ? "المدفوعات الذكية" : "Smart Payables"}{" "}
            {isAr && <span className="text-muted-foreground font-normal text-lg">(Smart Payables)</span>}
          </h1>

          {/* 3 KPI chips */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="rounded-lg border bg-card p-3 min-w-[160px]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                {isAr ? "إجمالي المستحق" : "Total Due"}
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground" suppressHydrationWarning>
                {fmt(1_240_500)}
              </p>
              <div className="text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md text-xs font-medium w-fit mt-1.5 flex items-center gap-1">
                ↘ {isAr ? "مستحق الدفع" : "Due"}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 min-w-[160px]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                {isAr ? "مستحق هذا الأسبوع" : "Due This Week"}
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground" suppressHydrationWarning>
                {fmt(320_000)}
              </p>
              <div className="text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md text-xs font-medium w-fit mt-1.5 flex items-center gap-1">
                ↗ {isAr ? "هذا الأسبوع" : "This Week"}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3 min-w-[160px]">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                {isAr ? "وفر محتمل (خصم مبكر)" : "Potential Savings (Early Discount)"}
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground" suppressHydrationWarning>
                {fmt(12_500)}
              </p>
              <div className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md text-xs font-medium w-fit mt-1.5 flex items-center gap-1">
                ↗ {isAr ? "وفر محتمل" : "Potential Savings"}
              </div>
            </div>
          </div>
        </div>

        {/* B. Invoice list card */}
        <Card className="flex-1 overflow-hidden flex flex-col shadow-sm border-border/50">
          {/* Filter bar */}
          <div className="flex items-center gap-2 p-3 border-b shrink-0">
            <div className="relative flex-1">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder={isAr ? "بحث في الفواتير..." : "Search invoices..."} className="h-8 ps-8 text-xs" />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0">
              {isAr ? "حالة الفاتورة" : "Invoice Status"} <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0">
              {isAr ? "ترتيب حسب" : "Sort By"} <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </div>

          {/* Scrollable invoice rows */}
          <div className="flex-1 overflow-y-auto">
            {INVOICES.map((inv) => {
              const isSelected = inv.id === selectedId;
              const meta = PRIORITY_META[inv.priority];
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id)}
                  className={`p-4 border-b cursor-pointer flex justify-between items-center transition-colors gap-4 ${
                    isSelected
                      ? "bg-blue-500/10 border-s-4 border-s-blue-500"
                      : "hover:bg-muted/50 border-s-4 border-s-transparent"
                  }`}
                >
                  {/* Right side (RTL start) */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                        inv.priority === "urgent"
                          ? "border-destructive/40 bg-destructive/5 text-destructive"
                          : inv.priority === "delay"
                          ? "border-orange-400/40 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                          : "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                      }`}>
                        {meta.dot} {meta.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold truncate">{inv.vendor}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {inv.invoice} · {isAr ? "تستحق في" : "Due"} {inv.due}
                    </p>
                  </div>

                  {/* Left side (RTL end) */}
                  <p className="text-sm font-bold tabular-nums shrink-0" suppressHydrationWarning>
                    {fmt(inv.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT PANE — Invoice Detail + AI Copilot
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-[2] flex flex-col gap-4 border-s border-border/50 ps-6 overflow-y-auto min-w-0 pb-4">

        {/* A. Invoice context card */}
        <Card className="p-5 shadow-sm border-border/50 shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
            {isAr ? "فاتورة" : "Invoice"} #{selected.invoice} / {selected.vendor}
          </p>
          <p className="text-3xl font-bold tabular-nums mt-2" suppressHydrationWarning>
            {fmt(selected.amount)}
          </p>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              selected.priority === "urgent"
                ? "bg-destructive/10 text-destructive"
                : selected.priority === "delay"
                ? "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
            }`}>
              <Clock className="h-3 w-3" />
              {isAr ? "تستحق في" : "Due"} {selected.due}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">{isAr ? "تاريخ الفاتورة" : "Invoice Date"}</p>
              <p>{isAr ? "1 أكتوبر 2026" : "Oct 1, 2026"}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">{isAr ? "شروط الدفع" : "Payment Terms"}</p>
              <p>Net 30</p>
            </div>
            <div>
              <p className="font-medium text-foreground">{isAr ? "الحساب" : "Account"}</p>
              <p>{isAr ? "QNB — الجاري" : "QNB — Current"}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">{isAr ? "العملة" : "Currency"}</p>
              <p suppressHydrationWarning>{currCode}</p>
            </div>
          </div>
        </Card>

        {/* B. Mustashar AI Copilot card */}
        <Card className="flex-1 p-6 bg-indigo-900/10 border-indigo-500/20 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <div>
              <p className="text-sm font-bold">{isAr ? "تحليل الوكيل مُستشار" : "Mustashar Agent Analysis"}</p>
              <p className="text-[10px] text-muted-foreground">Mustashar AI Analysis</p>
            </div>
            <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-semibold px-2 py-0.5">
              <Sparkles className="h-2.5 w-2.5" />
              AI
            </span>
          </div>

          <div className="rounded-lg bg-white/60 dark:bg-white/5 border border-blue-100 dark:border-blue-900/50 p-4">
            <p className="text-sm text-foreground leading-relaxed">
              {isAr
                ? <>سداد هذه الفاتورة غداً سيؤدي إلى انخفاض الرصيد تحت الحد الآمن في حساب QNB. نظراً لتاريخك الجيد مع <strong>{selected.vendor}</strong>، أرجح تأجيل الدفع لمدة 14 يوماً بدون غرامات لتجنب كسر السيولة.</>
                : <>Paying this invoice tomorrow will drop the balance below the safe threshold in your QNB account. Given your good history with <strong>{selected.vendor}</strong>, I recommend delaying payment by 14 days without penalties to avoid a liquidity shortfall.</>
              }
            </p>
          </div>

          {selected.priority === "urgent" && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed">
                {isAr
                  ? `تحذير: السداد الفوري سيخفض الرصيد إلى ما دون الحد الأدنى المطلوب (${fmt(50_000)}).`
                  : `Warning: Immediate payment will reduce the balance below the required minimum (${fmt(50_000)}).`
                }
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-auto">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2" size="sm">
              <Clock className="h-3.5 w-3.5" />
              {isAr ? "موافق، تأجيل السداد 14 يوم" : "Approve, Delay Payment 14 Days"}
            </Button>
            <Button
              variant="outline"
              className="w-full border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-2"
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isAr ? "سداد الآن للاستفادة من خصم 2%" : "Pay Now — 2% Discount"}
            </Button>
            <Button variant="outline" className="w-full gap-2" size="sm">
              <MessageCircle className="h-3.5 w-3.5" />
              {isAr ? "تواصل مع المورد عبر واتساب" : "Contact Vendor via WhatsApp"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
