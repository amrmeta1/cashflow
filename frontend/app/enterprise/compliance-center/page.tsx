"use client";

import {
  ShieldCheck,
  FileCheck2,
  Receipt,
  UserCheck,
  ClipboardCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Bot,
  Zap,
  QrCode,
  Link2,
  RefreshCw,
  CircleDot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type ComplianceStatus = "compliant" | "upcoming" | "action_required" | "ready";

interface ComplianceArea {
  key: string;
  icon: React.ReactNode;
  titleEn: string;
  titleAr: string;
  status: ComplianceStatus;
  statusEn: string;
  statusAr: string;
  descEn: string;
  descAr: string;
  score: number;
}

type KycStatus = "valid" | "expiring" | "expired";
type RiskLevel = "low" | "medium" | "high";

interface Counterparty {
  nameEn: string;
  nameAr: string;
  typeEn: string;
  typeAr: string;
  kyc: KycStatus;
  lastVerifiedEn: string;
  lastVerifiedAr: string;
  risk: RiskLevel;
  actionEn: string | null;
  actionAr: string | null;
}

interface Deadline {
  dateEn: string;
  dateAr: string;
  titleEn: string;
  titleAr: string;
}

interface ChecklistItem {
  labelEn: string;
  labelAr: string;
  done: boolean;
}

interface RecentInvoice {
  id: string;
  customerEn: string;
  customerAr: string;
  amount: number;
  statusEn: string;
  statusAr: string;
  zatcaStatus: "cleared" | "reported" | "pending";
}

// ── Data ─────────────────────────────────────────────────────────────────────

const OVERALL_SCORE = 92;

const COMPLIANCE_AREAS: ComplianceArea[] = [
  {
    key: "zatca",
    icon: <Receipt className="h-5 w-5 text-emerald-500" />,
    titleEn: "ZATCA E-Invoicing",
    titleAr: "الفوترة الإلكترونية - هيئة الزكاة",
    status: "compliant",
    statusEn: "Compliant",
    statusAr: "ممتثل",
    descEn: "Phase 2 integrated. 847/847 invoices compliant this quarter.",
    descAr: "المرحلة الثانية مدمجة. ٨٤٧/٨٤٧ فاتورة ممتثلة هذا الربع.",
    score: 100,
  },
  {
    key: "vat",
    icon: <FileCheck2 className="h-5 w-5 text-blue-500" />,
    titleEn: "VAT Filing",
    titleAr: "تقديم ضريبة القيمة المضافة",
    status: "upcoming",
    statusEn: "Upcoming",
    statusAr: "قادم",
    descEn: "Q1 2026 filing due in 12 days. All documents ready.",
    descAr: "موعد تقديم الربع الأول ٢٠٢٦ خلال ١٢ يومًا. جميع المستندات جاهزة.",
    score: 95,
  },
  {
    key: "aml",
    icon: <UserCheck className="h-5 w-5 text-amber-500" />,
    titleEn: "AML / KYC",
    titleAr: "مكافحة غسل الأموال / اعرف عميلك",
    status: "action_required",
    statusEn: "Action Required",
    statusAr: "إجراء مطلوب",
    descEn: "3 counterparties pending KYC refresh (expired > 12 months).",
    descAr: "٣ أطراف مقابلة تحتاج تجديد KYC (منتهية > ١٢ شهرًا).",
    score: 78,
  },
  {
    key: "audit",
    icon: <ClipboardCheck className="h-5 w-5 text-emerald-500" />,
    titleEn: "Audit Readiness",
    titleAr: "الجاهزية للتدقيق",
    status: "ready",
    statusEn: "Ready",
    statusAr: "جاهز",
    descEn: "All reconciliations current. 98% transaction categorization.",
    descAr: "جميع المطابقات محدّثة. تصنيف ٩٨٪ من المعاملات.",
    score: 96,
  },
];

const COUNTERPARTIES: Counterparty[] = [
  { nameEn: "Al Meera Trading", nameAr: "تجارة الميرة", typeEn: "Supplier", typeAr: "مورد", kyc: "valid", lastVerifiedEn: "Dec 2025", lastVerifiedAr: "ديسمبر ٢٠٢٥", risk: "low", actionEn: null, actionAr: null },
  { nameEn: "Gulf Contractors", nameAr: "مقاولات الخليج", typeEn: "Supplier", typeAr: "مورد", kyc: "expiring", lastVerifiedEn: "Mar 2025", lastVerifiedAr: "مارس ٢٠٢٥", risk: "medium", actionEn: "Renew", actionAr: "تجديد" },
  { nameEn: "Rashid Holdings", nameAr: "شركة راشد القابضة", typeEn: "Client", typeAr: "عميل", kyc: "expired", lastVerifiedEn: "Jan 2025", lastVerifiedAr: "يناير ٢٠٢٥", risk: "high", actionEn: "Urgent", actionAr: "عاجل" },
  { nameEn: "Ooredoo", nameAr: "أوريدو", typeEn: "Vendor", typeAr: "بائع", kyc: "valid", lastVerifiedEn: "Nov 2025", lastVerifiedAr: "نوفمبر ٢٠٢٥", risk: "low", actionEn: null, actionAr: null },
  { nameEn: "Saudi Electric", nameAr: "الكهرباء السعودية", typeEn: "Vendor", typeAr: "بائع", kyc: "valid", lastVerifiedEn: "Oct 2025", lastVerifiedAr: "أكتوبر ٢٠٢٥", risk: "low", actionEn: null, actionAr: null },
  { nameEn: "AlRajhi Bank", nameAr: "مصرف الراجحي", typeEn: "Bank", typeAr: "بنك", kyc: "valid", lastVerifiedEn: "Sep 2025", lastVerifiedAr: "سبتمبر ٢٠٢٥", risk: "low", actionEn: null, actionAr: null },
];

const DEADLINES: Deadline[] = [
  { dateEn: "Mar 8, 2026", dateAr: "٨ مارس ٢٠٢٦", titleEn: "ZATCA monthly report submission", titleAr: "تقديم التقرير الشهري لهيئة الزكاة" },
  { dateEn: "Mar 15, 2026", dateAr: "١٥ مارس ٢٠٢٦", titleEn: "VAT Q1 filing deadline", titleAr: "الموعد النهائي لتقديم ضريبة القيمة المضافة للربع الأول" },
  { dateEn: "Mar 31, 2026", dateAr: "٣١ مارس ٢٠٢٦", titleEn: "Annual Zakat declaration", titleAr: "الإقرار السنوي للزكاة" },
  { dateEn: "Apr 15, 2026", dateAr: "١٥ أبريل ٢٠٢٦", titleEn: "GOSI quarterly report", titleAr: "التقرير الربعي للتأمينات الاجتماعية" },
  { dateEn: "Jun 30, 2026", dateAr: "٣٠ يونيو ٢٠٢٦", titleEn: "Annual audit submission", titleAr: "تقديم التدقيق السنوي" },
];

const CHECKLIST: ChecklistItem[] = [
  { labelEn: "E-invoicing Phase 2 integration", labelAr: "دمج المرحلة الثانية للفوترة الإلكترونية", done: true },
  { labelEn: "VAT registration active", labelAr: "تسجيل ضريبة القيمة المضافة نشط", done: true },
  { labelEn: "Commercial Registration current", labelAr: "السجل التجاري ساري", done: true },
  { labelEn: "GOSI registration active", labelAr: "تسجيل التأمينات الاجتماعية نشط", done: true },
  { labelEn: "Bank reconciliations up to date", labelAr: "المطابقات البنكية محدّثة", done: true },
  { labelEn: "KYC refresh for 3 counterparties", labelAr: "تجديد KYC لـ ٣ أطراف مقابلة", done: false },
  { labelEn: "Transfer pricing documentation", labelAr: "وثائق التسعير التحويلي", done: true },
  { labelEn: "Withholding tax compliance", labelAr: "الامتثال لضريبة الاستقطاع", done: true },
];

const RECENT_INVOICES: RecentInvoice[] = [
  { id: "INV-2026-0847", customerEn: "Al Meera Trading", customerAr: "تجارة الميرة", amount: 12_500, statusEn: "Cleared", statusAr: "تمت المقاصة", zatcaStatus: "cleared" },
  { id: "INV-2026-0846", customerEn: "Ooredoo", customerAr: "أوريدو", amount: 8_200, statusEn: "Cleared", statusAr: "تمت المقاصة", zatcaStatus: "cleared" },
  { id: "INV-2026-0845", customerEn: "Gulf Contractors", customerAr: "مقاولات الخليج", amount: 34_700, statusEn: "Reported", statusAr: "تم الإبلاغ", zatcaStatus: "reported" },
  { id: "INV-2026-0844", customerEn: "Saudi Electric", customerAr: "الكهرباء السعودية", amount: 5_600, statusEn: "Cleared", statusAr: "تمت المقاصة", zatcaStatus: "cleared" },
  { id: "INV-2026-0843", customerEn: "Rashid Holdings", customerAr: "شركة راشد القابضة", amount: 21_300, statusEn: "Cleared", statusAr: "تمت المقاصة", zatcaStatus: "cleared" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeConfig(status: ComplianceStatus) {
  const map: Record<ComplianceStatus, { icon: React.ReactNode; className: string }> = {
    compliant: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    upcoming: {
      icon: <Clock className="h-3 w-3" />,
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    },
    action_required: {
      icon: <AlertTriangle className="h-3 w-3" />,
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    ready: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
  };
  return map[status];
}

function scoreBarColor(score: number) {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 80) return "bg-blue-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function kycBadge(kyc: KycStatus, isAr: boolean) {
  const map: Record<KycStatus, { icon: React.ReactNode; label: string; className: string }> = {
    valid: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: isAr ? "ساري" : "Valid",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    expiring: {
      icon: <AlertTriangle className="h-3 w-3" />,
      label: isAr ? "ينتهي قريبًا" : "Expiring",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    expired: {
      icon: <XCircle className="h-3 w-3" />,
      label: isAr ? "منتهي" : "Expired",
      className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    },
  };
  const { icon, label, className } = map[kyc];
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium gap-1", className)}>
      {icon} {label}
    </Badge>
  );
}

function riskBadge(risk: RiskLevel, isAr: boolean) {
  const map: Record<RiskLevel, { label: string; className: string }> = {
    low: {
      label: isAr ? "منخفض" : "Low",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    medium: {
      label: isAr ? "متوسط" : "Medium",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    high: {
      label: isAr ? "مرتفع" : "High",
      className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    },
  };
  const { label, className } = map[risk];
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", className)}>
      {label}
    </Badge>
  );
}

function zatcaStatusBadge(status: RecentInvoice["zatcaStatus"], isAr: boolean) {
  const map: Record<RecentInvoice["zatcaStatus"], { label: string; className: string }> = {
    cleared: {
      label: isAr ? "تمت المقاصة" : "Cleared",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    },
    reported: {
      label: isAr ? "تم الإبلاغ" : "Reported",
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    },
    pending: {
      label: isAr ? "قيد الانتظار" : "Pending",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
  };
  const { label, className } = map[status];
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", className)}>
      {label}
    </Badge>
  );
}

function rowRiskBg(risk: RiskLevel) {
  if (risk === "high") return "bg-red-500/5";
  if (risk === "medium") return "bg-amber-500/5";
  return "";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ComplianceCenterPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { profile } = useCompany();
  const currency = profile.currency ?? "SAR";

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* ── 1. Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {isAr ? "مركز الامتثال" : "Compliance Center"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "مراقبة الامتثال التنظيمي عبر جميع العمليات"
                  : "Monitor regulatory compliance across all operations"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-emerald-500/30 bg-emerald-500/10">
              <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {OVERALL_SCORE}%
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Compliance Overview — 4 Status Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPLIANCE_AREAS.map((area) => {
            const badge = statusBadgeConfig(area.status);
            return (
              <Card key={area.key} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {area.icon}
                      <CardTitle className="text-sm font-semibold">
                        {isAr ? area.titleAr : area.titleEn}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="outline" className={cn("text-[11px] font-medium gap-1", badge.className)}>
                    {badge.icon}
                    {isAr ? area.statusAr : area.statusEn}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isAr ? area.descAr : area.descEn}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{isAr ? "الدرجة" : "Score"}</span>
                      <span className={cn("font-bold tabular-nums", area.score >= 90 ? "text-emerald-600 dark:text-emerald-400" : area.score >= 80 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400")}>
                        {area.score}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", scoreBarColor(area.score))}
                        style={{ width: `${area.score}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── 3. ZATCA E-Invoicing Detail ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "تفاصيل الفوترة الإلكترونية - هيئة الزكاة" : "ZATCA E-Invoicing Details"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phase Status */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">{isAr ? "المرحلة الأولى" : "Phase 1"}</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]">
                    {isAr ? "مكتمل منذ يناير ٢٠٢٤" : "Complete since Jan 2024"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">{isAr ? "المرحلة الثانية" : "Phase 2"}</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]">
                    {isAr ? "مدمج منذ يناير ٢٠٢٥" : "Integrated since Jan 2025"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  <span>{isAr ? "حالة الربط:" : "Integration:"}</span>
                  <span className="font-medium text-foreground">
                    {isAr ? "متصل ببيئة اختبار هيئة الزكاة" : "Connected to ZATCA sandbox"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4" />
                  <span>{isAr ? "آخر مزامنة:" : "Last sync:"}</span>
                  <span className="font-medium text-foreground">
                    {isAr ? "منذ دقيقتين" : "2 minutes ago"}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">847</p>
                  <p className="text-xs text-muted-foreground">{isAr ? "فواتير هذا الربع" : "Invoices this quarter"}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">0</p>
                  <p className="text-xs text-muted-foreground">{isAr ? "مرفوضة" : "Rejected"}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">0</p>
                  <p className="text-xs text-muted-foreground">{isAr ? "قيد الانتظار" : "Pending"}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <QrCode className="h-4 w-4 text-emerald-500" />
                    <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">100%</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{isAr ? "امتثال QR" : "QR compliance"}</p>
                </div>
              </div>
            </div>

            {/* Recent Invoices Mini-Table */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {isAr ? "أحدث الفواتير" : "Recent Invoices"}
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className={cn("px-3 py-2 font-medium text-muted-foreground", isAr ? "text-right" : "text-left")}>
                        {isAr ? "رقم الفاتورة" : "Invoice #"}
                      </th>
                      <th className={cn("px-3 py-2 font-medium text-muted-foreground", isAr ? "text-right" : "text-left")}>
                        {isAr ? "العميل" : "Customer"}
                      </th>
                      <th className={cn("px-3 py-2 font-medium text-muted-foreground", isAr ? "text-right" : "text-left")}>
                        {isAr ? "المبلغ" : "Amount"}
                      </th>
                      <th className={cn("px-3 py-2 font-medium text-muted-foreground", isAr ? "text-right" : "text-left")}>
                        {isAr ? "حالة هيئة الزكاة" : "ZATCA Status"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {RECENT_INVOICES.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-mono text-xs">{inv.id}</td>
                        <td className="px-3 py-2">{isAr ? inv.customerAr : inv.customerEn}</td>
                        <td className="px-3 py-2 tabular-nums">{inv.amount.toLocaleString()} {currency}</td>
                        <td className="px-3 py-2">{zatcaStatusBadge(inv.zatcaStatus, isAr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 4. KYC / AML Compliance Table ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "امتثال KYC / مكافحة غسل الأموال" : "KYC / AML Compliance"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className={cn("px-3 py-2 font-medium text-muted-foreground", isAr ? "text-right" : "text-left")}>
                      {isAr ? "الطرف المقابل" : "Counterparty"}
                    </th>
                    <th className={cn("px-3 py-2 font-medium text-muted-foreground", isAr ? "text-right" : "text-left")}>
                      {isAr ? "النوع" : "Type"}
                    </th>
                    <th className={cn("px-3 py-2 font-medium text-muted-foreground", isAr ? "text-right" : "text-left")}>
                      {isAr ? "حالة KYC" : "KYC Status"}
                    </th>
                    <th className={cn("px-3 py-2 font-medium text-muted-foreground", isAr ? "text-right" : "text-left")}>
                      {isAr ? "آخر تحقق" : "Last Verified"}
                    </th>
                    <th className={cn("px-3 py-2 font-medium text-muted-foreground", isAr ? "text-right" : "text-left")}>
                      {isAr ? "مستوى المخاطر" : "Risk Level"}
                    </th>
                    <th className={cn("px-3 py-2 font-medium text-muted-foreground", isAr ? "text-right" : "text-left")}>
                      {isAr ? "إجراء" : "Action"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COUNTERPARTIES.map((cp) => (
                    <tr key={cp.nameEn} className={cn("border-b last:border-b-0 transition-colors", rowRiskBg(cp.risk))}>
                      <td className="px-3 py-2.5 font-medium">{isAr ? cp.nameAr : cp.nameEn}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{isAr ? cp.typeAr : cp.typeEn}</td>
                      <td className="px-3 py-2.5">{kycBadge(cp.kyc, isAr)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{isAr ? cp.lastVerifiedAr : cp.lastVerifiedEn}</td>
                      <td className="px-3 py-2.5">{riskBadge(cp.risk, isAr)}</td>
                      <td className="px-3 py-2.5">
                        {cp.actionEn ? (
                          <Button
                            size="sm"
                            variant={cp.risk === "high" ? "destructive" : "outline"}
                            className="h-7 text-xs px-3"
                          >
                            {isAr ? cp.actionAr : cp.actionEn}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── 5. Compliance Calendar + 6. Regulatory Checklist ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Compliance Calendar */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "تقويم الامتثال" : "Compliance Calendar"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {DEADLINES.map((d, i) => (
                  <div key={i} className="flex gap-3 relative">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                        i === 0
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-muted-foreground/30 bg-muted/50"
                      )}>
                        <CircleDot className={cn("h-3.5 w-3.5", i === 0 ? "text-blue-500" : "text-muted-foreground/50")} />
                      </div>
                      {i < DEADLINES.length - 1 && (
                        <div className="w-px h-full bg-border min-h-[24px]" />
                      )}
                    </div>
                    <div className="pb-5">
                      <p className="text-xs font-medium text-muted-foreground tabular-nums">
                        {isAr ? d.dateAr : d.dateEn}
                      </p>
                      <p className="text-sm font-medium">
                        {isAr ? d.titleAr : d.titleEn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Regulatory Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-sm font-semibold">
                    {isAr ? "قائمة التحقق التنظيمية" : "Regulatory Checklist"}
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {CHECKLIST.filter((c) => c.done).length}/{CHECKLIST.length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {CHECKLIST.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      item.done ? "bg-emerald-500/5" : "bg-amber-500/5"
                    )}
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <span className={cn("text-sm", item.done ? "text-foreground" : "text-amber-700 dark:text-amber-400 font-medium")}>
                      {isAr ? item.labelAr : item.labelEn}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 7. AI Insight Card ── */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                <Bot className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {isAr ? "تحليل الوكيل رقيب" : "Agent Raqib's Compliance Insight"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "تحليل ذكي لوضع الامتثال" : "AI-powered compliance posture analysis"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
              {isAr ? (
                <p>
                  ٣ أطراف مقابلة تحتاج تجديد KYC. <strong>مقاولات الخليج</strong> تنتهي صلاحيتها خلال ٥ أيام — ابدأ التجديد الآن لتجنب حظر المعاملات. وضعك العام للامتثال قوي عند <strong>٩٢٪</strong>.
                </p>
              ) : (
                <p>
                  3 counterparties need KYC renewal. <strong>Gulf Contractors</strong> expires in 5 days — initiate renewal now to avoid transaction blocks. Your overall compliance posture is strong at <strong>92%</strong>.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" className="gap-2 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]">
                <Zap className="h-3.5 w-3.5" />
                {isAr ? "بدء تجديد KYC" : "Start KYC Renewal"}
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isAr ? "عرض تقرير الامتثال الكامل" : "View Full Compliance Report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
