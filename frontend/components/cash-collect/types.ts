// ── CashCollect shared types & mock data ──────────────────────────────────────

export type AgingBucket =
  | "current"
  | "overdue_1_30"
  | "overdue_31_60"
  | "overdue_90";

export type ClientType = "vip" | "regular" | "high_risk";

export interface Receivable {
  id: string;
  client: string;
  clientAr: string;
  amount: number;
  status: AgingBucket;
  daysOverdue: number;
  type: ClientType;
  invoiceRef: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const RECEIVABLES: Receivable[] = [
  {
    id: "inv1",
    client: "Saudi Aramco",
    clientAr: "أرامكو السعودية",
    amount: 450_000,
    status: "current",
    daysOverdue: 0,
    type: "vip",
    invoiceRef: "INV-2024-0091",
  },
  {
    id: "inv2",
    client: "Al-Futtaim Retail",
    clientAr: "الفطيم للتجزئة",
    amount: 120_000,
    status: "overdue_1_30",
    daysOverdue: 12,
    type: "regular",
    invoiceRef: "INV-2024-0087",
  },
  {
    id: "inv3",
    client: "Tech Startup LLC",
    clientAr: "تك ستارتب المحدودة",
    amount: 85_000,
    status: "overdue_31_60",
    daysOverdue: 45,
    type: "regular",
    invoiceRef: "INV-2024-0079",
  },
  {
    id: "inv4",
    client: "Local Contractor Co",
    clientAr: "شركة المقاول المحلي",
    amount: 135_000,
    status: "overdue_90",
    daysOverdue: 110,
    type: "high_risk",
    invoiceRef: "INV-2024-0061",
  },
];

// ── Bucket metadata ───────────────────────────────────────────────────────────

export const BUCKET_META: Record<
  AgingBucket,
  {
    label: { en: string; ar: string };
    accent: string;
    badgeClass: string;
  }
> = {
  current: {
    label: { en: "Current (Not Due)", ar: "جارية (غير مستحقة)" },
    accent: "border-s-emerald-500",
    badgeClass:
      "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
  },
  overdue_1_30: {
    label: { en: "1–30 Days Overdue", ar: "متأخرة ١–٣٠ يوم" },
    accent: "border-s-amber-500",
    badgeClass:
      "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10",
  },
  overdue_31_60: {
    label: { en: "31–60 Days Overdue", ar: "متأخرة ٣١–٦٠ يوم" },
    accent: "border-s-orange-500",
    badgeClass:
      "border-orange-500/40 text-orange-700 dark:text-orange-400 bg-orange-500/10",
  },
  overdue_90: {
    label: { en: "90+ Days (Critical)", ar: "+٩٠ يوم (حرجة)" },
    accent: "border-s-destructive",
    badgeClass:
      "border-destructive/40 text-destructive bg-destructive/10",
  },
};
