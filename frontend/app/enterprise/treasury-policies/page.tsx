"use client";

import { useState } from "react";
import {
  Settings2,
  Plus,
  Shield,
  AlertTriangle,
  TrendingUp,
  Bell,
  Clock,
  BarChart3,
  Lock,
  Banknote,
  CircleDollarSign,
  Activity,
  FileWarning,
  CheckCircle2,
  Pause,
  Pencil,
  Zap,
  ShieldCheck,
  Timer,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type PolicyCategory = "all" | "safety" | "optimization" | "alerts";

interface Policy {
  id: string;
  icon: React.ReactNode;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  conditionEn: string;
  conditionAr: string;
  conditionAmount?: number;
  actionEn: string;
  actionAr: string;
  category: Exclude<PolicyCategory, "all">;
  triggerCount: number;
  triggerLabelEn: string;
  triggerLabelAr: string;
  lastTriggeredEn: string;
  lastTriggeredAr: string;
  active: boolean;
}

interface TriggerEvent {
  timeEn: string;
  timeAr: string;
  policyEn: string;
  policyAr: string;
  detailEn: string;
  detailAr: string;
  detailAmount?: number;
  resultEn: string;
  resultAr: string;
  resultAmount?: number;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const POLICIES: Policy[] = [
  {
    id: "min-cash-floor",
    icon: <Shield className="h-5 w-5" />,
    nameEn: "Minimum Cash Floor",
    nameAr: "الحد الأدنى للرصيد النقدي",
    descEn: "Protect against cash shortfalls by enforcing a minimum balance",
    descAr: "الحماية من نقص السيولة بفرض حد أدنى للرصيد",
    conditionEn: "Balance < {0}",
    conditionAr: "الرصيد < {0}",
    conditionAmount: 100_000,
    actionEn: "Send critical alert + Block non-essential payments",
    actionAr: "إرسال تنبيه حرج + حظر المدفوعات غير الأساسية",
    category: "safety",
    triggerCount: 0,
    triggerLabelEn: "0 triggers",
    triggerLabelAr: "٠ تنبيهات",
    lastTriggeredEn: "Never",
    lastTriggeredAr: "لم يتم التفعيل",
    active: true,
  },
  {
    id: "dso-escalation",
    icon: <AlertTriangle className="h-5 w-5" />,
    nameEn: "DSO Escalation",
    nameAr: "تصعيد أيام التحصيل",
    descEn: "Auto-escalate when collection days exceed threshold",
    descAr: "تصعيد تلقائي عند تجاوز أيام التحصيل الحد المسموح",
    conditionEn: "DSO > 45 days",
    conditionAr: "أيام التحصيل > ٤٥ يوم",
    actionEn: "Auto-send reminder via CashCollect + Notify CFO",
    actionAr: "إرسال تذكير تلقائي عبر CashCollect + إشعار المدير المالي",
    category: "alerts",
    triggerCount: 3,
    triggerLabelEn: "3 this month",
    triggerLabelAr: "٣ هذا الشهر",
    lastTriggeredEn: "2 hours ago",
    lastTriggeredAr: "قبل ساعتين",
    active: true,
  },
  {
    id: "surplus-sweep",
    icon: <CircleDollarSign className="h-5 w-5" />,
    nameEn: "Surplus Sweep",
    nameAr: "تحويل الفائض",
    descEn: "Optimize idle cash by suggesting high-yield deposits",
    descAr: "تحسين السيولة الراكدة باقتراح ودائع عالية العائد",
    conditionEn: "Balance > {0} for 3+ days",
    conditionAr: "الرصيد > {0} لمدة ٣+ أيام",
    conditionAmount: 500_000,
    actionEn: "Suggest moving excess to high-yield deposit",
    actionAr: "اقتراح تحويل الفائض إلى وديعة عالية العائد",
    category: "optimization",
    triggerCount: 2,
    triggerLabelEn: "2 triggers",
    triggerLabelAr: "٢ تنبيهات",
    lastTriggeredEn: "1 day ago",
    lastTriggeredAr: "قبل يوم",
    active: true,
  },
  {
    id: "payroll-readiness",
    icon: <Banknote className="h-5 w-5" />,
    nameEn: "Payroll Readiness",
    nameAr: "جاهزية الرواتب",
    descEn: "Ensure payroll account is funded before salary run",
    descAr: "التأكد من تمويل حساب الرواتب قبل موعد الصرف",
    conditionEn: "Payroll due in ≤ 5 days AND payroll account < required amount",
    conditionAr: "الرواتب مستحقة خلال ≤ ٥ أيام والرصيد أقل من المطلوب",
    actionEn: "Alert + Suggest intercompany transfer",
    actionAr: "تنبيه + اقتراح تحويل بين الشركات",
    category: "safety",
    triggerCount: 1,
    triggerLabelEn: "1 trigger",
    triggerLabelAr: "١ تنبيه",
    lastTriggeredEn: "3 days ago",
    lastTriggeredAr: "قبل ٣ أيام",
    active: true,
  },
  {
    id: "fx-exposure",
    icon: <BarChart3 className="h-5 w-5" />,
    nameEn: "FX Exposure Limit",
    nameAr: "حد التعرض للعملات",
    descEn: "Monitor foreign currency concentration risk",
    descAr: "مراقبة مخاطر تركز العملات الأجنبية",
    conditionEn: "USD exposure > 15% of total balance",
    conditionAr: "تعرض الدولار > ١٥٪ من إجمالي الرصيد",
    actionEn: "Alert treasury team",
    actionAr: "تنبيه فريق الخزينة",
    category: "safety",
    triggerCount: 0,
    triggerLabelEn: "0 triggers",
    triggerLabelAr: "٠ تنبيهات",
    lastTriggeredEn: "Never",
    lastTriggeredAr: "لم يتم التفعيل",
    active: true,
  },
  {
    id: "invoice-aging",
    icon: <Clock className="h-5 w-5" />,
    nameEn: "Invoice Aging",
    nameAr: "تقادم الفواتير",
    descEn: "Escalate unpaid invoices past threshold",
    descAr: "تصعيد الفواتير غير المدفوعة بعد تجاوز المهلة",
    conditionEn: "Invoice unpaid > 30 days",
    conditionAr: "فاتورة غير مدفوعة > ٣٠ يوم",
    actionEn: "Auto-escalate to Level 2 collection",
    actionAr: "تصعيد تلقائي للمستوى الثاني من التحصيل",
    category: "alerts",
    triggerCount: 5,
    triggerLabelEn: "5 triggers",
    triggerLabelAr: "٥ تنبيهات",
    lastTriggeredEn: "2 days ago",
    lastTriggeredAr: "قبل يومين",
    active: true,
  },
  {
    id: "revenue-anomaly",
    icon: <Activity className="h-5 w-5" />,
    nameEn: "Revenue Anomaly",
    nameAr: "شذوذ الإيرادات",
    descEn: "Flag unusual revenue deviations for review",
    descAr: "رصد الانحرافات غير المعتادة في الإيرادات",
    conditionEn: "Daily revenue deviates > 30% from 30-day avg",
    conditionAr: "الإيراد اليومي ينحرف > ٣٠٪ عن متوسط ٣٠ يوم",
    actionEn: "Flag for review",
    actionAr: "تحديد للمراجعة",
    category: "alerts",
    triggerCount: 1,
    triggerLabelEn: "1 trigger",
    triggerLabelAr: "١ تنبيه",
    lastTriggeredEn: "5 days ago",
    lastTriggeredAr: "قبل ٥ أيام",
    active: true,
  },
  {
    id: "large-payment",
    icon: <Lock className="h-5 w-5" />,
    nameEn: "Large Payment Threshold",
    nameAr: "حد المدفوعات الكبيرة",
    descEn: "Require additional approval for high-value transactions",
    descAr: "طلب موافقة إضافية للمعاملات عالية القيمة",
    conditionEn: "Single payment > {0}",
    conditionAr: "دفعة واحدة > {0}",
    conditionAmount: 100_000,
    actionEn: "Require additional approval",
    actionAr: "طلب موافقة إضافية",
    category: "safety",
    triggerCount: 2,
    triggerLabelEn: "2 triggers",
    triggerLabelAr: "٢ تنبيهات",
    lastTriggeredEn: "5 hours ago",
    lastTriggeredAr: "قبل ٥ ساعات",
    active: true,
  },
];

const TRIGGER_TIMELINE: TriggerEvent[] = [
  {
    timeEn: "2h ago",
    timeAr: "قبل ساعتين",
    policyEn: "DSO Escalation",
    policyAr: "تصعيد أيام التحصيل",
    detailEn: "Triggered for Al Meera Trading (DSO: 48 days)",
    detailAr: "تم التفعيل لشركة الميرة للتجارة (أيام التحصيل: ٤٨ يوم)",
    resultEn: "WhatsApp reminder sent",
    resultAr: "تم إرسال تذكير واتساب",
  },
  {
    timeEn: "5h ago",
    timeAr: "قبل ٥ ساعات",
    policyEn: "Large Payment Threshold",
    policyAr: "حد المدفوعات الكبيرة",
    detailEn: "Triggered for {0} transfer",
    detailAr: "تم التفعيل لتحويل {0}",
    detailAmount: 150_000,
    resultEn: "Routed to approval",
    resultAr: "تم توجيهه للموافقة",
  },
  {
    timeEn: "1d ago",
    timeAr: "قبل يوم",
    policyEn: "Surplus Sweep",
    policyAr: "تحويل الفائض",
    detailEn: "Surplus detected in main account",
    detailAr: "تم رصد فائض في الحساب الرئيسي",
    resultEn: "Suggested {0} to deposit",
    resultAr: "اقتراح تحويل {0} إلى وديعة",
    resultAmount: 200_000,
  },
  {
    timeEn: "2d ago",
    timeAr: "قبل يومين",
    policyEn: "Invoice Aging",
    policyAr: "تقادم الفواتير",
    detailEn: "3 invoices exceeded 30-day threshold",
    detailAr: "٣ فواتير تجاوزت حد ٣٠ يوم",
    resultEn: "Escalated to Level 2",
    resultAr: "تم التصعيد للمستوى الثاني",
  },
  {
    timeEn: "3d ago",
    timeAr: "قبل ٣ أيام",
    policyEn: "Payroll Readiness",
    policyAr: "جاهزية الرواتب",
    detailEn: "Payroll account underfunded by {0}",
    detailAr: "حساب الرواتب أقل بـ {0}",
    detailAmount: 35_000,
    resultEn: "{0} transferred from HQ",
    resultAr: "تم تحويل {0} من المقر الرئيسي",
    resultAmount: 35_000,
  },
  {
    timeEn: "5d ago",
    timeAr: "قبل ٥ أيام",
    policyEn: "Revenue Anomaly",
    policyAr: "شذوذ الإيرادات",
    detailEn: "Daily revenue dropped 35% below average",
    detailAr: "انخفض الإيراد اليومي ٣٥٪ عن المتوسط",
    resultEn: "Reviewed, normal (seasonal)",
    resultAr: "تمت المراجعة، طبيعي (موسمي)",
  },
];

const CATEGORY_COLORS: Record<Exclude<PolicyCategory, "all">, string> = {
  safety: "border-l-emerald-500",
  optimization: "border-l-indigo-500",
  alerts: "border-l-amber-500",
};

const CATEGORY_ICON_BG: Record<Exclude<PolicyCategory, "all">, string> = {
  safety: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  optimization: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  alerts: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const CATEGORY_BADGE: Record<Exclude<PolicyCategory, "all">, string> = {
  safety: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  optimization: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  alerts: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function categoryLabelEn(cat: Exclude<PolicyCategory, "all">): string {
  return { safety: "Safety", optimization: "Optimization", alerts: "Alerts" }[cat];
}

function categoryLabelAr(cat: Exclude<PolicyCategory, "all">): string {
  return { safety: "الحماية", optimization: "التحسين", alerts: "التنبيهات" }[cat];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TreasuryPoliciesPage() {
  const { t, dir } = useI18n();
  const { fmt } = useCurrency();
  const isAr = dir === "rtl";

  const [activeCategory, setActiveCategory] = useState<PolicyCategory>("all");

  const categories: { key: PolicyCategory; labelEn: string; labelAr: string }[] = [
    { key: "all", labelEn: "All", labelAr: "الكل" },
    { key: "safety", labelEn: "Safety", labelAr: "الحماية" },
    { key: "optimization", labelEn: "Optimization", labelAr: "التحسين" },
    { key: "alerts", labelEn: "Alerts", labelAr: "التنبيهات" },
  ];

  const filteredPolicies =
    activeCategory === "all"
      ? POLICIES
      : POLICIES.filter((p) => p.category === activeCategory);

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-2 ring-primary/20">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {isAr ? "سياسات الخزينة" : "Treasury Policies"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isAr
                    ? "إعداد قواعد تلقائية لحماية وتحسين السيولة"
                    : "Configure automated rules to protect and optimize your cash"}
                </p>
              </div>
            </div>
          </div>
          <Button className="gap-2 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]">
            <Plus className="h-4 w-4" />
            {isAr ? "إنشاء قاعدة جديدة" : "Create New Rule"}
          </Button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">8</p>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "قواعد نشطة" : "Active Rules"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Zap className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">2</p>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "تم التفعيل اليوم" : "Triggered Today"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Pause className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-muted-foreground">0</p>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "متوقفة" : "Paused"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Category Filter ── */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {isAr ? cat.labelAr : cat.labelEn}
              </button>
            );
          })}
        </div>

        {/* ── Policy Cards ── */}
        <div className="grid grid-cols-1 gap-4">
          {filteredPolicies.map((policy) => (
            <Card
              key={policy.id}
              className={cn(
                "border-l-4 transition-all hover:shadow-md",
                CATEGORY_COLORS[policy.category]
              )}
            >
              <CardContent className="p-5 space-y-4">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        CATEGORY_ICON_BG[policy.category]
                      )}
                    >
                      {policy.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold leading-tight">
                        {isAr ? policy.nameAr : policy.nameEn}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {isAr ? policy.descAr : policy.descEn}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="h-3 w-3 me-1" />
                    {isAr ? "نشط" : "Active"}
                  </Badge>
                </div>

                {/* IF / THEN boxes */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 mt-0.5 font-mono text-xs bg-muted/50">
                      IF
                    </Badge>
                    <div className="flex-1 rounded-md bg-muted/60 px-3 py-2 text-sm font-mono">
                      {policy.conditionAmount
                        ? (isAr ? policy.conditionAr : policy.conditionEn).replace("{0}", fmt(policy.conditionAmount))
                        : (isAr ? policy.conditionAr : policy.conditionEn)}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 mt-0.5 font-mono text-xs bg-primary/10 text-primary border-primary/20">
                      THEN
                    </Badge>
                    <div className="flex-1 rounded-md bg-primary/5 border border-primary/10 px-3 py-2 text-sm">
                      {isAr ? policy.actionAr : policy.actionEn}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("text-xs", CATEGORY_BADGE[policy.category])}>
                      {isAr ? categoryLabelAr(policy.category) : categoryLabelEn(policy.category)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {isAr ? policy.triggerLabelAr : policy.triggerLabelEn}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      •{" "}
                      {isAr ? "آخر تفعيل: " : "Last: "}
                      {isAr ? policy.lastTriggeredAr : policy.lastTriggeredEn}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                      <Pencil className="h-3.5 w-3.5" />
                      {isAr ? "تعديل" : "Edit"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                      <Pause className="h-3.5 w-3.5" />
                      {isAr ? "إيقاف" : "Pause"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Recent Triggers Timeline ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">
                {isAr ? "آخر التفعيلات" : "Recent Triggers"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {TRIGGER_TIMELINE.map((event, idx) => (
                <div key={idx} className="flex gap-4 pb-5 last:pb-0">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                    </div>
                    {idx < TRIGGER_TIMELINE.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pt-0.5 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        {isAr ? event.timeAr : event.timeEn}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {isAr ? event.policyAr : event.policyEn}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">
                      {event.detailAmount
                        ? (isAr ? event.detailAr : event.detailEn).replace("{0}", fmt(event.detailAmount))
                        : (isAr ? event.detailAr : event.detailEn)}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      {event.resultAmount
                        ? (isAr ? event.resultAr : event.resultEn).replace("{0}", fmt(event.resultAmount))
                        : (isAr ? event.resultAr : event.resultEn)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Policy Effectiveness Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {isAr ? "مشكلات تم تفاديها" : "Prevented Issues"}
                </span>
              </div>
              <p className="text-3xl font-bold tabular-nums">12</p>
              <p className="text-xs text-muted-foreground">
                {isAr ? "هذا الربع" : "This quarter"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-background">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {isAr ? "أموال تم تحسينها" : "Money Optimized"}
                </span>
              </div>
              <p className="text-3xl font-bold tabular-nums">
                {fmt(45_000)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isAr ? "من تحويل الفوائض" : "From surplus sweeps"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-background to-background">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
                  <Timer className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {isAr ? "متوسط وقت الاستجابة" : "Avg Response Time"}
                </span>
              </div>
              <p className="text-3xl font-bold tabular-nums">
                {isAr ? "٤.٢ دقيقة" : "4.2 min"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isAr ? "من التفعيل إلى الإجراء" : "Trigger to action"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
