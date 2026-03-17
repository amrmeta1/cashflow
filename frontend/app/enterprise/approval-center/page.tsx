"use client";

import { useState } from "react";
import {
  CheckSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  User,
  Check,
  X,
  AlertCircle,
  Timer,
  TrendingUp,
  Paperclip,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { Progress } from "@/components/shared/ui/progress";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface Approver {
  initials: string;
  name: string;
  nameAr: string;
  role: string;
  roleAr: string;
  approved: boolean;
  approvedAt?: string;
  approvedAtAr?: string;
}

interface ApprovalRequest {
  id: string;
  type: "payment" | "transfer" | "payroll";
  descriptionEn: string;
  descriptionAr: string;
  amount: number;
  level: number;
  approvalsNeeded: number;
  approvalsCollected: number;
  approvers: Approver[];
  requestorEn: string;
  requestorAr: string;
  requestorInitials: string;
  submittedEn: string;
  submittedAr: string;
  timeRemainingEn: string;
  timeRemainingAr: string;
  fromAccountEn: string;
  fromAccountAr: string;
  toEn: string;
  toAr: string;
  bankEn: string;
  bankAr: string;
  reference: string;
  categoryEn: string;
  categoryAr: string;
  documents: { name: string; size: string }[];
}

interface CompletedApproval {
  id: string;
  descriptionEn: string;
  descriptionAr: string;
  amount: number;
  status: "approved" | "rejected";
  completedEn: string;
  completedAr: string;
  durationEn: string;
  durationAr: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const POLICY_LEVELS = [
  {
    level: 1,
    color: "border-t-emerald-500",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-500",
    rangeDisplay: (fmt: (n: number) => string, isAr: boolean) =>
      isAr ? `حتى ${fmt(50_000)}` : `Up to ${fmt(50_000)}`,
    approversNeeded: 1,
    roles: [
      { initials: "FM", nameEn: "Finance Manager", nameAr: "مدير المالية" },
    ],
  },
  {
    level: 2,
    color: "border-t-amber-500",
    bg: "bg-amber-500/10",
    dot: "bg-amber-500",
    rangeDisplay: (fmt: (n: number) => string) =>
      `${fmt(50_001)} – ${fmt(500_000)}`,
    approversNeeded: 2,
    roles: [
      { initials: "FM", nameEn: "Finance Manager", nameAr: "مدير المالية" },
      { initials: "CF", nameEn: "CFO", nameAr: "المدير المالي" },
    ],
  },
  {
    level: 3,
    color: "border-t-red-500",
    bg: "bg-red-500/10",
    dot: "bg-red-500",
    rangeDisplay: (fmt: (n: number) => string, isAr: boolean) =>
      isAr ? `أكثر من ${fmt(500_000)}` : `Above ${fmt(500_000)}`,
    approversNeeded: 3,
    roles: [
      { initials: "FM", nameEn: "Finance Manager", nameAr: "مدير المالية" },
      { initials: "CF", nameEn: "CFO", nameAr: "المدير المالي" },
      { initials: "CE", nameEn: "CEO", nameAr: "الرئيس التنفيذي" },
    ],
  },
];

const PENDING_APPROVALS: ApprovalRequest[] = [
  {
    id: "#APR-0156",
    type: "payment",
    descriptionEn: "Supplier X materials payment",
    descriptionAr: "دفعة مواد المورد X",
    amount: 28_000,
    level: 1,
    approvalsNeeded: 1,
    approvalsCollected: 0,
    approvers: [
      { initials: "FM", name: "Khalid Al-Rashid", nameAr: "خالد الراشد", role: "Finance Manager", roleAr: "مدير المالية", approved: false },
    ],
    requestorEn: "Ahmed",
    requestorAr: "أحمد",
    requestorInitials: "AH",
    submittedEn: "2h ago",
    submittedAr: "منذ ساعتين",
    timeRemainingEn: "2h left",
    timeRemainingAr: "ساعتان متبقيتان",
    fromAccountEn: "QNB - Corporate Account",
    fromAccountAr: "QNB - حساب الشركات",
    toEn: "Supplier X Co.",
    toAr: "شركة المورد X",
    bankEn: "Al Rajhi Bank",
    bankAr: "مصرف الراجحي",
    reference: "PO-2024-0089",
    categoryEn: "Materials & Supplies",
    categoryAr: "مواد ومستلزمات",
    documents: [
      { name: "Invoice.pdf", size: "245 KB" },
      { name: "PO-2024-089.pdf", size: "128 KB" },
    ],
  },
  {
    id: "#APR-0155",
    type: "payroll",
    descriptionEn: "Monthly payroll – December 2024",
    descriptionAr: "الرواتب الشهرية – ديسمبر ٢٠٢٤",
    amount: 89_000,
    level: 2,
    approvalsNeeded: 2,
    approvalsCollected: 1,
    approvers: [
      { initials: "FM", name: "Khalid Al-Rashid", nameAr: "خالد الراشد", role: "Finance Manager", roleAr: "مدير المالية", approved: true, approvedAt: "3h ago", approvedAtAr: "منذ ٣ ساعات" },
      { initials: "CF", name: "Nora Al-Faisal", nameAr: "نورة الفيصل", role: "CFO", roleAr: "المدير المالي", approved: false },
    ],
    requestorEn: "Sara",
    requestorAr: "سارة",
    requestorInitials: "SR",
    submittedEn: "5h ago",
    submittedAr: "منذ ٥ ساعات",
    timeRemainingEn: "3h left",
    timeRemainingAr: "٣ ساعات متبقية",
    fromAccountEn: "CBQ - Payroll Account",
    fromAccountAr: "CBQ - حساب الرواتب",
    toEn: "Employee Payroll",
    toAr: "رواتب الموظفين",
    bankEn: "CBQ",
    bankAr: "CBQ",
    reference: "PAY-2024-012",
    categoryEn: "Payroll",
    categoryAr: "رواتب",
    documents: [
      { name: "Payroll-Dec-2024.xlsx", size: "312 KB" },
    ],
  },
  {
    id: "#APR-0154",
    type: "payment",
    descriptionEn: "Office renovation contract",
    descriptionAr: "عقد تجديد المكتب",
    amount: 350_000,
    level: 2,
    approvalsNeeded: 2,
    approvalsCollected: 0,
    approvers: [
      { initials: "FM", name: "Khalid Al-Rashid", nameAr: "خالد الراشد", role: "Finance Manager", roleAr: "مدير المالية", approved: false },
      { initials: "CF", name: "Nora Al-Faisal", nameAr: "نورة الفيصل", role: "CFO", roleAr: "المدير المالي", approved: false },
    ],
    requestorEn: "Mohammed",
    requestorAr: "محمد",
    requestorInitials: "MH",
    submittedEn: "1d ago",
    submittedAr: "منذ يوم",
    timeRemainingEn: "Overdue",
    timeRemainingAr: "متأخر",
    fromAccountEn: "QNB - Corporate Account",
    fromAccountAr: "QNB - حساب الشركات",
    toEn: "BuildRight Contracting",
    toAr: "شركة بيلد رايت للمقاولات",
    bankEn: "Saudi National Bank",
    bankAr: "البنك الأهلي السعودي",
    reference: "CNT-2024-045",
    categoryEn: "Capital Expenditure",
    categoryAr: "نفقات رأسمالية",
    documents: [
      { name: "Contract-Renovation.pdf", size: "1.2 MB" },
      { name: "Quotation-Final.pdf", size: "456 KB" },
      { name: "FloorPlan-v3.pdf", size: "2.8 MB" },
    ],
  },
  {
    id: "#APR-0153",
    type: "transfer",
    descriptionEn: "Intercompany transfer to Construction LLC",
    descriptionAr: "تحويل بين الشركات إلى شركة البناء",
    amount: 150_000,
    level: 2,
    approvalsNeeded: 2,
    approvalsCollected: 1,
    approvers: [
      { initials: "FM", name: "Khalid Al-Rashid", nameAr: "خالد الراشد", role: "Finance Manager", roleAr: "مدير المالية", approved: true, approvedAt: "18h ago", approvedAtAr: "منذ ١٨ ساعة" },
      { initials: "CF", name: "Nora Al-Faisal", nameAr: "نورة الفيصل", role: "CFO", roleAr: "المدير المالي", approved: false },
    ],
    requestorEn: "Fatima",
    requestorAr: "فاطمة",
    requestorInitials: "FT",
    submittedEn: "1d ago",
    submittedAr: "منذ يوم",
    timeRemainingEn: "1h left",
    timeRemainingAr: "ساعة متبقية",
    fromAccountEn: "QNB - Corporate Account",
    fromAccountAr: "QNB - حساب الشركات",
    toEn: "FinchQ Construction LLC",
    toAr: "شركة فنش كيو للبناء",
    bankEn: "QNB",
    bankAr: "QNB",
    reference: "ICT-2024-008",
    categoryEn: "Intercompany Transfer",
    categoryAr: "تحويل بين الشركات",
    documents: [
      { name: "Transfer-Request.pdf", size: "98 KB" },
    ],
  },
  {
    id: "#APR-0152",
    type: "payment",
    descriptionEn: "Heavy equipment purchase – CAT excavator",
    descriptionAr: "شراء معدات ثقيلة – حفارة كاتربيلر",
    amount: 620_000,
    level: 3,
    approvalsNeeded: 3,
    approvalsCollected: 1,
    approvers: [
      { initials: "FM", name: "Khalid Al-Rashid", nameAr: "خالد الراشد", role: "Finance Manager", roleAr: "مدير المالية", approved: true, approvedAt: "1d ago", approvedAtAr: "منذ يوم" },
      { initials: "CF", name: "Nora Al-Faisal", nameAr: "نورة الفيصل", role: "CFO", roleAr: "المدير المالي", approved: false },
      { initials: "CE", name: "Sultan Al-Thani", nameAr: "سلطان آل ثاني", role: "CEO", roleAr: "الرئيس التنفيذي", approved: false },
    ],
    requestorEn: "Omar",
    requestorAr: "عمر",
    requestorInitials: "OM",
    submittedEn: "2d ago",
    submittedAr: "منذ يومين",
    timeRemainingEn: "Overdue",
    timeRemainingAr: "متأخر",
    fromAccountEn: "QNB - Corporate Account",
    fromAccountAr: "QNB - حساب الشركات",
    toEn: "Zahid Tractor & Heavy Machinery",
    toAr: "شركة زاهد للجرارات والمعدات الثقيلة",
    bankEn: "Banque Saudi Fransi",
    bankAr: "البنك السعودي الفرنسي",
    reference: "PO-2024-112",
    categoryEn: "Capital Expenditure",
    categoryAr: "نفقات رأسمالية",
    documents: [
      { name: "Invoice-CAT-EX200.pdf", size: "567 KB" },
      { name: "PO-2024-112.pdf", size: "128 KB" },
      { name: "Equipment-Spec.pdf", size: "3.4 MB" },
    ],
  },
];

const COMPLETED_APPROVALS: CompletedApproval[] = [
  { id: "#APR-0151", descriptionEn: "Ooredoo bill", descriptionAr: "فاتورة أوريدو", amount: 3_200, status: "approved", completedEn: "2h ago", completedAr: "منذ ساعتين", durationEn: "15 min", durationAr: "١٥ دقيقة" },
  { id: "#APR-0150", descriptionEn: "Client refund", descriptionAr: "استرداد عميل", amount: 12_000, status: "approved", completedEn: "5h ago", completedAr: "منذ ٥ ساعات", durationEn: "2h 30m", durationAr: "ساعتان و ٣٠ دقيقة" },
  { id: "#APR-0149", descriptionEn: "Marketing expense", descriptionAr: "مصروف تسويق", amount: 8_500, status: "rejected", completedEn: "1d ago", completedAr: "منذ يوم", durationEn: "4h", durationAr: "٤ ساعات" },
  { id: "#APR-0148", descriptionEn: "Server hosting", descriptionAr: "استضافة خوادم", amount: 4_200, status: "approved", completedEn: "1d ago", completedAr: "منذ يوم", durationEn: "45 min", durationAr: "٤٥ دقيقة" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeBadgeClasses(type: ApprovalRequest["type"]): string {
  switch (type) {
    case "payment":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "transfer":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "payroll":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
  }
}

function typeLabel(type: ApprovalRequest["type"], isAr: boolean): string {
  switch (type) {
    case "payment":
      return isAr ? "دفعة" : "Payment";
    case "transfer":
      return isAr ? "تحويل" : "Transfer";
    case "payroll":
      return isAr ? "رواتب" : "Payroll";
  }
}

// ── Avatar circle component ──────────────────────────────────────────────────

function AvatarCircle({
  initials,
  className,
  size = "md",
}: {
  initials: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const sizeClasses = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold ring-2 ring-background",
        sizeClasses,
        className,
      )}
    >
      {initials}
    </div>
  );
}

// ── Expanded detail panel ────────────────────────────────────────────────────

function ApprovalDetail({ req, isAr, fmt }: { req: ApprovalRequest; isAr: boolean; fmt: (n: number) => string }) {
  return (
    <div className="space-y-5 pt-4 border-t border-border/50">
      {/* Details table */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
        {[
          { labelEn: "From Account", labelAr: "من حساب", valueEn: req.fromAccountEn, valueAr: req.fromAccountAr },
          { labelEn: "To", labelAr: "إلى", valueEn: req.toEn, valueAr: req.toAr },
          { labelEn: "Bank", labelAr: "البنك", valueEn: req.bankEn, valueAr: req.bankAr },
          { labelEn: "Reference", labelAr: "المرجع", valueEn: req.reference, valueAr: req.reference },
          { labelEn: "Category", labelAr: "الفئة", valueEn: req.categoryEn, valueAr: req.categoryAr },
          { labelEn: "Amount", labelAr: "المبلغ", valueEn: fmt(req.amount), valueAr: fmt(req.amount) },
        ].map((field) => (
          <div key={field.labelEn}>
            <p className="text-muted-foreground text-xs mb-0.5">
              {isAr ? field.labelAr : field.labelEn}
            </p>
            <p className="font-medium">{isAr ? field.valueAr : field.valueEn}</p>
          </div>
        ))}
      </div>

      {/* Approval timeline */}
      <div>
        <p className="text-sm font-semibold mb-3">
          {isAr ? "مسار الموافقات" : "Approval Timeline"}
        </p>
        <div className="space-y-3">
          {req.approvers.map((a, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  a.approved
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {a.approved ? <Check className="h-4 w-4" /> : a.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {isAr ? a.nameAr : a.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({isAr ? a.roleAr : a.role})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.approved
                    ? `✓ ${isAr ? "تمت الموافقة" : "Approved"} — ${isAr ? a.approvedAtAr : a.approvedAt}`
                    : isAr
                      ? "⏳ في انتظار الموافقة"
                      : "⏳ Pending approval"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attached documents */}
      <div>
        <p className="text-sm font-semibold mb-2">
          <Paperclip className="inline h-3.5 w-3.5 me-1" />
          {isAr ? "المرفقات" : "Attached Documents"}
        </p>
        <div className="flex flex-wrap gap-2">
          {req.documents.map((doc) => (
            <div
              key={doc.name}
              className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs hover:bg-muted transition-colors cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{doc.name}</span>
              <span className="text-muted-foreground">{doc.size}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Comment box (disabled) */}
      <div>
        <p className="text-sm font-semibold mb-2">
          <MessageSquare className="inline h-3.5 w-3.5 me-1" />
          {isAr ? "ملاحظات" : "Comments"}
        </p>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          {isAr ? "لا توجد ملاحظات بعد" : "No comments yet"}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const { fmt } = useCurrency();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ── 1. Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mt-0.5">
              <CheckSquare className="h-5.5 w-5.5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isAr ? "مركز الموافقات" : "Approval Center"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isAr
                  ? "مراجعة والموافقة على المدفوعات والتحويلات المعلقة"
                  : "Review and approve pending payments and transfers"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 gap-1">
              <Clock className="h-3 w-3" />
              {isAr ? "٥ معلقة" : "5 Pending"}
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 gap-1">
              <Check className="h-3 w-3" />
              {isAr ? "١٢ موافق عليها اليوم" : "12 Approved Today"}
            </Badge>
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 gap-1">
              <X className="h-3 w-3" />
              {isAr ? "١ مرفوضة" : "1 Rejected"}
            </Badge>
          </div>
        </div>

        {/* ── 2. Approval Policy Cards ── */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            <Shield className="inline h-3.5 w-3.5 me-1.5" />
            {isAr ? "سياسة الموافقات" : "Approval Policy"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {POLICY_LEVELS.map((p) => (
              <Card
                key={p.level}
                className={cn(
                  "border-t-4 transition-shadow hover:shadow-md",
                  p.color,
                )}
              >
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs font-mono">
                      {isAr ? `المستوى ${p.level}` : `Level ${p.level}`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {p.approversNeeded} {isAr ? "موافق" : p.approversNeeded === 1 ? "approver" : "approvers"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold">
                    {p.rangeDisplay(fmt, isAr)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {p.roles.map((r, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {i > 0 && (
                          <span className="text-muted-foreground text-xs">+</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <AvatarCircle initials={r.initials} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {isAr ? r.nameAr : r.nameEn}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── 3. Pending Approvals Queue ── */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            <AlertCircle className="inline h-3.5 w-3.5 me-1.5" />
            {isAr ? "طلبات الموافقة المعلقة" : "Pending Approval Requests"}
          </h2>
          <div className="space-y-3">
            {PENDING_APPROVALS.map((req) => {
              const isExpanded = expandedId === req.id;
              const progressPct =
                req.approvalsNeeded > 0
                  ? (req.approvalsCollected / req.approvalsNeeded) * 100
                  : 0;
              const isOverdue = req.timeRemainingEn === "Overdue";

              return (
                <Card
                  key={req.id}
                  className={cn(
                    "transition-all duration-200 hover:shadow-md",
                    isExpanded && "ring-1 ring-primary/20 shadow-md",
                  )}
                >
                  <CardContent className="p-5">
                    {/* Top row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => toggleExpand(req.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        <span className="text-xs font-mono text-muted-foreground">
                          {req.id}
                        </span>
                        <Badge
                          className={cn(
                            "border-0 text-[11px]",
                            typeBadgeClasses(req.type),
                          )}
                        >
                          {typeLabel(req.type, isAr)}
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {isAr ? req.descriptionAr : req.descriptionEn}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={cn(
                            "border-0 text-[11px]",
                            isOverdue
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Timer className="h-3 w-3 me-1" />
                          {isAr ? req.timeRemainingAr : req.timeRemainingEn}
                        </Badge>
                      </div>
                    </div>

                    {/* Details row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-bold text-base tabular-nums">
                          {fmt(req.amount)}
                        </span>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <AvatarCircle initials={req.requestorInitials} size="sm" />
                          <span className="text-xs">
                            {isAr ? req.requestorAr : req.requestorEn} · {isAr ? req.submittedAr : req.submittedEn}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-mono">
                          {isAr ? `المستوى ${req.level}` : `Level ${req.level}`}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Approval progress */}
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress
                            value={progressPct}
                            className={cn(
                              "h-2 flex-1",
                              "[&>div]:transition-all [&>div]:duration-500",
                              progressPct === 0
                                ? "[&>div]:bg-muted-foreground/30"
                                : progressPct < 100
                                  ? "[&>div]:bg-amber-500"
                                  : "[&>div]:bg-emerald-500",
                            )}
                          />
                          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                            {req.approvalsCollected}/{req.approvalsNeeded}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm h-8 px-3"
                          >
                            <Check className="h-3.5 w-3.5" />
                            {isAr ? "موافقة" : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 gap-1.5 h-8 px-3"
                          >
                            <X className="h-3.5 w-3.5" />
                            {isAr ? "رفض" : "Reject"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && <ApprovalDetail req={req} isAr={isAr} fmt={fmt} />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── 4. Recently Completed ── */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            <Check className="inline h-3.5 w-3.5 me-1.5" />
            {isAr ? "المعاملات المكتملة مؤخراً" : "Recently Completed"}
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                        {isAr ? "المعرف" : "ID"}
                      </th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                        {isAr ? "الوصف" : "Description"}
                      </th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                        {isAr ? "المبلغ" : "Amount"}
                      </th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                        {isAr ? "الحالة" : "Status"}
                      </th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                        {isAr ? "اكتمل" : "Completed"}
                      </th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                        {isAr ? "المدة" : "Duration"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPLETED_APPROVALS.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {c.id}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {isAr ? c.descriptionAr : c.descriptionEn}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-medium">
                          {fmt(c.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={cn(
                              "border-0 text-[11px]",
                              c.status === "approved"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                            )}
                          >
                            {c.status === "approved"
                              ? isAr
                                ? "✅ تمت الموافقة"
                                : "✅ Approved"
                              : isAr
                                ? "❌ مرفوض"
                                : "❌ Rejected"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {isAr ? c.completedAr : c.completedEn}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {isAr ? c.durationAr : c.durationEn}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 5. Approval Analytics ── */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            <TrendingUp className="inline h-3.5 w-3.5 me-1.5" />
            {isAr ? "تحليلات الموافقات" : "Approval Analytics"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                labelEn: "Avg. Approval Time",
                labelAr: "متوسط وقت الموافقة",
                valueEn: "1.8 hours",
                valueAr: "١.٨ ساعة",
                icon: Timer,
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-100 dark:bg-blue-900/40",
              },
              {
                labelEn: "Approval Rate",
                labelAr: "نسبة الموافقة",
                valueEn: "94%",
                valueAr: "٩٤٪",
                icon: Check,
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-100 dark:bg-emerald-900/40",
              },
              {
                labelEn: "SLA Compliance",
                labelAr: "الالتزام بمستوى الخدمة",
                valueEn: "98%",
                valueAr: "٩٨٪",
                subtitleEn: "Within 4-hour target",
                subtitleAr: "ضمن هدف ٤ ساعات",
                icon: Shield,
                color: "text-violet-600 dark:text-violet-400",
                bg: "bg-violet-100 dark:bg-violet-900/40",
              },
            ].map((m) => (
              <Card
                key={m.labelEn}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="flex items-center gap-4 py-5">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      m.bg,
                    )}
                  >
                    <m.icon className={cn("h-5 w-5", m.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isAr ? m.labelAr : m.labelEn}
                    </p>
                    <p className="text-xl font-bold tabular-nums">
                      {isAr ? m.valueAr : m.valueEn}
                    </p>
                    {"subtitleEn" in m && (
                      <p className="text-[11px] text-muted-foreground">
                        {isAr ? m.subtitleAr : m.subtitleEn}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
