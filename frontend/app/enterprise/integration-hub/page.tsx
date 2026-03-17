"use client";

import {
  Plug,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowRight,
  Building2,
  FileText,
  Shield,
  Cloud,
  CreditCard,
  Activity,
  XCircle,
  ChevronRight,
  Zap,
  Server,
  Link2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";

// ── Bank Integrations ────────────────────────────────────────────────────────

interface BankIntegration {
  id: string;
  nameEn: string;
  nameAr: string;
  status: "connected" | "issue";
  protocol: string;
  lastSyncEn: string;
  lastSyncAr: string;
  accounts: number;
  txToday: number;
  uptime: string;
  errorEn?: string;
  errorAr?: string;
  lastSyncSeverity?: "normal" | "warning";
}

const BANKS: BankIntegration[] = [
  {
    id: "qnb",
    nameEn: "QNB (Qatar National Bank)",
    nameAr: "QNB (بنك قطر الوطني)",
    status: "connected",
    protocol: "Open Banking API",
    lastSyncEn: "2 min ago",
    lastSyncAr: "منذ ٢ دقيقة",
    accounts: 3,
    txToday: 12,
    uptime: "99.99%",
  },
  {
    id: "cbq",
    nameEn: "CBQ (Commercial Bank)",
    nameAr: "CBQ (البنك التجاري)",
    status: "connected",
    protocol: "SWIFT MT940",
    lastSyncEn: "15 min ago",
    lastSyncAr: "منذ ١٥ دقيقة",
    accounts: 1,
    txToday: 4,
    uptime: "99.95%",
  },
  {
    id: "mar",
    nameEn: "Masraf Al Rayan",
    nameAr: "مصرف الريان",
    status: "connected",
    protocol: "File Upload (CSV)",
    lastSyncEn: "1 hour ago",
    lastSyncAr: "منذ ساعة",
    accounts: 1,
    txToday: 2,
    uptime: "99.80%",
  },
  {
    id: "rajhi",
    nameEn: "AlRajhi Bank",
    nameAr: "مصرف الراجحي",
    status: "issue",
    protocol: "OAuth 2.0",
    lastSyncEn: "6 hours ago",
    lastSyncAr: "منذ ٦ ساعات",
    accounts: 2,
    txToday: 0,
    uptime: "97.20%",
    errorEn: "OAuth token expired. Re-authenticate required.",
    errorAr: "انتهت صلاحية رمز المصادقة. يلزم إعادة المصادقة.",
    lastSyncSeverity: "warning",
  },
];

// ── ERP Systems ──────────────────────────────────────────────────────────────

interface ErpIntegration {
  id: string;
  nameEn: string;
  nameAr: string;
  typeEn: string;
  typeAr: string;
  syncEn: string;
  syncAr: string;
  entitiesEn: string;
  entitiesAr: string;
  lastSyncEn: string;
  lastSyncAr: string;
  dataEn: string;
  dataAr: string;
}

const ERP_SYSTEMS: ErpIntegration[] = [
  {
    id: "sap",
    nameEn: "SAP S/4HANA",
    nameAr: "SAP S/4HANA",
    typeEn: "ERP System",
    typeAr: "نظام تخطيط موارد المؤسسة",
    syncEn: "Bi-directional",
    syncAr: "ثنائي الاتجاه",
    entitiesEn: "5 group companies",
    entitiesAr: "٥ شركات مجموعة",
    lastSyncEn: "5 min ago",
    lastSyncAr: "منذ ٥ دقائق",
    dataEn: "GL entries, AP/AR, Cost Centers",
    dataAr: "قيود يومية، ذمم دائنة/مدينة، مراكز تكلفة",
  },
  {
    id: "qoyod",
    nameEn: "Qoyod (قيود)",
    nameAr: "قيود (Qoyod)",
    typeEn: "Accounting Software",
    typeAr: "برنامج محاسبة",
    syncEn: "One-way (import)",
    syncAr: "أحادي الاتجاه (استيراد)",
    entitiesEn: "1 company",
    entitiesAr: "شركة واحدة",
    lastSyncEn: "30 min ago",
    lastSyncAr: "منذ ٣٠ دقيقة",
    dataEn: "Chart of accounts, Journal entries",
    dataAr: "شجرة الحسابات، قيود يومية",
  },
];

// ── Government & Regulatory ──────────────────────────────────────────────────

interface GovIntegration {
  id: string;
  nameEn: string;
  nameAr: string;
  rows: { labelEn: string; labelAr: string; valueEn: string; valueAr: string }[];
}

const GOV_SYSTEMS: GovIntegration[] = [
  {
    id: "zatca",
    nameEn: "ZATCA",
    nameAr: "هيئة الزكاة والضريبة والجمارك",
    rows: [
      { labelEn: "Platform", labelAr: "المنصة", valueEn: "Fatoora Platform", valueAr: "منصة فاتورة" },
      { labelEn: "Phase 2 Integration", labelAr: "تكامل المرحلة الثانية", valueEn: "Active", valueAr: "نشط" },
      { labelEn: "Invoices submitted today", labelAr: "الفواتير المرسلة اليوم", valueEn: "8", valueAr: "٨" },
      { labelEn: "Last submission", labelAr: "آخر إرسال", valueEn: "45 min ago", valueAr: "منذ ٤٥ دقيقة" },
    ],
  },
  {
    id: "gosi",
    nameEn: "GOSI",
    nameAr: "التأمينات الاجتماعية",
    rows: [
      { labelEn: "Sync", labelAr: "المزامنة", valueEn: "Monthly", valueAr: "شهري" },
      { labelEn: "Last report", labelAr: "آخر تقرير", valueEn: "Jan 2026", valueAr: "يناير ٢٠٢٦" },
      { labelEn: "Next due", labelAr: "الاستحقاق القادم", valueEn: "Mar 10, 2026", valueAr: "١٠ مارس ٢٠٢٦" },
    ],
  },
];

// ── Available Integrations ───────────────────────────────────────────────────

interface AvailableIntegration {
  id: string;
  nameEn: string;
  nameAr: string;
  typeEn: string;
  typeAr: string;
  descEn: string;
  descAr: string;
}

const AVAILABLE: AvailableIntegration[] = [
  {
    id: "xero",
    nameEn: "Xero",
    nameAr: "Xero",
    typeEn: "Cloud Accounting",
    typeAr: "محاسبة سحابية",
    descEn: "Connect your Xero account for automatic sync",
    descAr: "اربط حساب Xero للمزامنة التلقائية",
  },
  {
    id: "stripe",
    nameEn: "Stripe",
    nameAr: "Stripe",
    typeEn: "Payment Gateway",
    typeAr: "بوابة الدفع",
    descEn: "Process online payments and auto-reconcile",
    descAr: "معالجة المدفوعات عبر الإنترنت والتسوية التلقائية",
  },
];

// ── Sync Log ─────────────────────────────────────────────────────────────────

interface SyncEvent {
  id: string;
  timeEn: string;
  timeAr: string;
  source: string;
  status: "success" | "failed" | "warning";
  detailEn: string;
  detailAr: string;
}

const SYNC_LOG: SyncEvent[] = [
  { id: "1", timeEn: "2 min ago", timeAr: "منذ ٢ دقيقة", source: "QNB", status: "success", detailEn: "12 transactions synced", detailAr: "١٢ معاملة تمت مزامنتها" },
  { id: "2", timeEn: "5 min ago", timeAr: "منذ ٥ دقائق", source: "SAP S/4HANA", status: "success", detailEn: "45 GL entries synced", detailAr: "٤٥ قيد يومي تمت مزامنته" },
  { id: "3", timeEn: "15 min ago", timeAr: "منذ ١٥ دقيقة", source: "CBQ", status: "success", detailEn: "4 transactions synced", detailAr: "٤ معاملات تمت مزامنتها" },
  { id: "4", timeEn: "30 min ago", timeAr: "منذ ٣٠ دقيقة", source: "Qoyod", status: "success", detailEn: "8 journal entries synced", detailAr: "٨ قيود يومية تمت مزامنتها" },
  { id: "5", timeEn: "45 min ago", timeAr: "منذ ٤٥ دقيقة", source: "ZATCA", status: "success", detailEn: "8 invoices submitted", detailAr: "٨ فواتير تم إرسالها" },
  { id: "6", timeEn: "1h ago", timeAr: "منذ ساعة", source: "Masraf Al Rayan", status: "success", detailEn: "2 transactions synced", detailAr: "٢ معاملة تمت مزامنتها" },
  { id: "7", timeEn: "4h ago", timeAr: "منذ ٤ ساعات", source: "AlRajhi Bank", status: "failed", detailEn: "Token expired", detailAr: "انتهت صلاحية الرمز" },
  { id: "8", timeEn: "6h ago", timeAr: "منذ ٦ ساعات", source: "AlRajhi Bank", status: "warning", detailEn: "Token expiring soon", detailAr: "الرمز على وشك الانتهاء" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function IntegrationsHubPage() {
  const { locale, dir } = useI18n();
  const { profile } = useCompany();
  const isAr = locale === "ar";

  return (
    <div dir={dir} className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">

        {/* ═══ HEADER ═══ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                <Plug className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isAr ? "مركز التكاملات" : "Integration Hub"}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "إدارة جميع الخدمات ومصادر البيانات المتصلة"
                : "Manage all connected services and data sources"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3 w-3 me-1" />
              {isAr ? "٨ متصل" : "8 Connected"}
            </Badge>
            <Badge variant="secondary">
              <Cloud className="h-3 w-3 me-1" />
              {isAr ? "٢ متاح" : "2 Available"}
            </Badge>
            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border-rose-200 dark:border-rose-800">
              <AlertTriangle className="h-3 w-3 me-1" />
              {isAr ? "١ مشكلة" : "1 Issue"}
            </Badge>
          </div>
        </div>

        {/* ═══ SYSTEM HEALTH STRIP ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  {isAr ? "وقت تشغيل API" : "API Uptime"}
                </p>
                <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">99.97%</p>
                <p className="text-[10px] text-muted-foreground">{isAr ? "آخر ٣٠ يوم" : "Last 30 days"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  {isAr ? "متوسط وقت المزامنة" : "Avg Sync Time"}
                </p>
                <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  2.3{isAr ? " ثانية" : "s"}
                </p>
                <p className="text-[10px] text-muted-foreground">{isAr ? "جميع الاتصالات" : "All connections"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  {isAr ? "فشل المزامنة (٢٤ ساعة)" : "Failed Syncs (24h)"}
                </p>
                <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">1</p>
                <p className="text-[10px] text-muted-foreground">{isAr ? "مصرف الراجحي" : "AlRajhi Bank"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══ BANKING CONNECTIONS ═══ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {isAr ? "الاتصالات البنكية" : "Banking Connections"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BANKS.map((bank) => (
              <Card
                key={bank.id}
                className={cn(
                  "shadow-sm transition-colors",
                  bank.status === "issue"
                    ? "border-amber-300 dark:border-amber-800"
                    : "border-border/50"
                )}
              >
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {isAr ? bank.nameAr : bank.nameEn}
                    </CardTitle>
                    {bank.status === "connected" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 me-1" />
                        {isAr ? "متصل" : "Connected"}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px]">
                        <AlertTriangle className="h-3 w-3 me-1" />
                        {isAr ? "مشكلة" : "Issue"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {bank.protocol}
                  </Badge>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isAr ? "آخر مزامنة" : "Last sync"}</span>
                      <span
                        className={cn(
                          "font-medium tabular-nums",
                          bank.lastSyncSeverity === "warning"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-foreground"
                        )}
                      >
                        {isAr ? bank.lastSyncAr : bank.lastSyncEn}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isAr ? "الحسابات" : "Accounts"}</span>
                      <span className="font-medium tabular-nums">{bank.accounts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isAr ? "المعاملات اليوم" : "Tx today"}</span>
                      <span className="font-medium tabular-nums">{bank.txToday}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isAr ? "وقت التشغيل" : "Uptime"}</span>
                      <span className="font-medium tabular-nums">{bank.uptime}</span>
                    </div>
                  </div>

                  {bank.errorEn && (
                    <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      {isAr ? bank.errorAr : bank.errorEn}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    {bank.status === "issue" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                      >
                        <RefreshCw className="h-3 w-3" />
                        {isAr ? "إعادة الاتصال" : "Reconnect"}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                        <RefreshCw className="h-3 w-3" />
                        {isAr ? "مزامنة الآن" : "Sync Now"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ═══ ERP & ACCOUNTING SYSTEMS ═══ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {isAr ? "أنظمة ERP والمحاسبة" : "ERP & Accounting Systems"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ERP_SYSTEMS.map((erp) => (
              <Card key={erp.id} className="shadow-sm border-border/50">
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {isAr ? erp.nameAr : erp.nameEn}
                    </CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 me-1" />
                      {isAr ? "متصل" : "Connected"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {isAr ? erp.typeAr : erp.typeEn}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {isAr ? erp.syncAr : erp.syncEn}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isAr ? "الكيانات" : "Entities synced"}</span>
                      <span className="font-medium">{isAr ? erp.entitiesAr : erp.entitiesEn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isAr ? "آخر مزامنة" : "Last sync"}</span>
                      <span className="font-medium tabular-nums">{isAr ? erp.lastSyncAr : erp.lastSyncEn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isAr ? "البيانات" : "Data"}</span>
                      <span className="font-medium text-end max-w-[60%]">{isAr ? erp.dataAr : erp.dataEn}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ═══ GOVERNMENT & REGULATORY ═══ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {isAr ? "الأنظمة الحكومية والتنظيمية" : "Government & Regulatory"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GOV_SYSTEMS.map((gov) => (
              <Card key={gov.id} className="shadow-sm border-border/50">
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {isAr ? gov.nameAr : gov.nameEn}
                    </CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 me-1" />
                      {isAr ? "متصل" : "Connected"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="space-y-1.5 text-xs">
                    {gov.rows.map((row) => (
                      <div key={row.labelEn} className="flex justify-between">
                        <span className="text-muted-foreground">{isAr ? row.labelAr : row.labelEn}</span>
                        <span className="font-medium tabular-nums">{isAr ? row.valueAr : row.valueEn}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ═══ AVAILABLE INTEGRATIONS ═══ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {isAr ? "التكاملات المتاحة" : "Available Integrations"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AVAILABLE.map((item) => (
              <Card
                key={item.id}
                className="shadow-sm border-dashed border-border/70 opacity-80 hover:opacity-100 transition-opacity"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {item.id === "xero" ? (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{isAr ? item.nameAr : item.nameEn}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                      {isAr ? item.typeAr : item.typeEn}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isAr ? item.descAr : item.descEn}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0">
                    <Link2 className="h-3 w-3" />
                    {isAr ? "ربط" : "Connect"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ═══ SYNC ACTIVITY LOG ═══ */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "سجل نشاط المزامنة" : "Sync Activity Log"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-0">
              {SYNC_LOG.map((evt, idx) => (
                <div
                  key={evt.id}
                  className={cn(
                    "flex items-center gap-3 py-2.5",
                    idx < SYNC_LOG.length - 1 && "border-b border-border/30"
                  )}
                >
                  <div className="relative flex flex-col items-center">
                    {evt.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : evt.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-rose-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-xs text-muted-foreground tabular-nums w-24 shrink-0">
                      {isAr ? evt.timeAr : evt.timeEn}
                    </span>
                    <span className="text-xs font-semibold w-32 shrink-0 truncate">{evt.source}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {isAr ? evt.detailAr : evt.detailEn}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] shrink-0",
                      evt.status === "success" && "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
                      evt.status === "failed" && "text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-800",
                      evt.status === "warning" && "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800"
                    )}
                  >
                    {evt.status === "success"
                      ? isAr ? "نجاح" : "Success"
                      : evt.status === "failed"
                        ? isAr ? "فشل" : "Failed"
                        : isAr ? "تحذير" : "Warning"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ═══ DATA FLOW VISUALIZATION ═══ */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2 pt-5 px-5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                {isAr ? "تدفق البيانات" : "Data Flow"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-6">
            <div className="flex flex-col gap-6">
              {/* Flow Row 1: Banks → Tadfuq → ERP */}
              <div className="flex items-center justify-center gap-0 flex-wrap">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {isAr ? "البنوك" : "Banks"}
                  </span>
                </div>

                <div className="flex items-center px-2">
                  <div className="h-[2px] w-8 bg-blue-300 dark:bg-blue-700" />
                  <ChevronRight className="h-4 w-4 text-blue-400 dark:text-blue-600 -mx-1" />
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 border-2 border-indigo-400 dark:border-indigo-600 shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/50">
                    <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Tadfuq</span>
                </div>

                <div className="flex items-center px-2">
                  <div className="h-[2px] w-8 bg-emerald-300 dark:bg-emerald-700" />
                  <ChevronRight className="h-4 w-4 text-emerald-400 dark:text-emerald-600 -mx-1" />
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800">
                    <Server className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {isAr ? "ERP" : "ERP"}
                  </span>
                </div>
              </div>

              {/* Flow Row 2: Banks → Tadfuq → ZATCA */}
              <div className="flex items-center justify-center gap-0 flex-wrap">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {isAr ? "البنوك" : "Banks"}
                  </span>
                </div>

                <div className="flex items-center px-2">
                  <div className="h-[2px] w-8 bg-blue-300 dark:bg-blue-700" />
                  <ChevronRight className="h-4 w-4 text-blue-400 dark:text-blue-600 -mx-1" />
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 border-2 border-indigo-400 dark:border-indigo-600 shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/50">
                    <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Tadfuq</span>
                </div>

                <div className="flex items-center px-2">
                  <div className="h-[2px] w-8 bg-amber-300 dark:bg-amber-700" />
                  <ChevronRight className="h-4 w-4 text-amber-400 dark:text-amber-600 -mx-1" />
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800">
                    <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">ZATCA</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
