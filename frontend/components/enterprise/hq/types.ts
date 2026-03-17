// ── HQ Hub shared types & mock data ──────────────────────────────────────────

export type EntityStatus = "surplus" | "deficit" | "healthy";

export interface Subsidiary {
  id: string;
  name: string;
  nameAr: string;
  balance: number;
  status: EntityStatus;
  trend: string;
  trendPositive: boolean;
}

export interface GroupMetrics {
  groupName: string;
  groupNameAr: string;
  consolidatedCash: number;
  totalDebt: number;
  idleCapital: number;
  groupRunwayMonths: number;
  burnRate: number;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const GROUP_METRICS: GroupMetrics = {
  groupName: "Al-Majd Holding Group",
  groupNameAr: "مجموعة الماجد القابضة",
  consolidatedCash: 8_450_000,
  totalDebt: 4_200_000,
  idleCapital: 3_800_000,
  groupRunwayMonths: 14,
  burnRate: -420_000,
};

export const SUBSIDIARIES: Subsidiary[] = [
  {
    id: "sub1",
    name: "Al-Majd Real Estate",
    nameAr: "الماجد للعقارات",
    balance: 5_200_000,
    status: "surplus",
    trend: "+12%",
    trendPositive: true,
  },
  {
    id: "sub2",
    name: "Al-Majd Contracting",
    nameAr: "الماجد للمقاولات",
    balance: -1_250_000,
    status: "deficit",
    trend: "-8%",
    trendPositive: false,
  },
  {
    id: "sub3",
    name: "Al-Majd Retail",
    nameAr: "الماجد للتجزئة",
    balance: 3_400_000,
    status: "healthy",
    trend: "+4%",
    trendPositive: true,
  },
  {
    id: "sub4",
    name: "Al-Majd Logistics",
    nameAr: "الماجد للخدمات اللوجستية",
    balance: 1_100_000,
    status: "healthy",
    trend: "-1%",
    trendPositive: false,
  },
];

// ── Status helpers ────────────────────────────────────────────────────────────

export const STATUS_DOT: Record<EntityStatus, string> = {
  surplus: "bg-emerald-500",
  deficit: "bg-destructive",
  healthy: "bg-blue-400",
};

export const STATUS_RING: Record<EntityStatus, string> = {
  surplus: "ring-emerald-500/20",
  deficit: "ring-destructive/20",
  healthy: "ring-blue-400/20",
};

export const STATUS_LABEL: Record<EntityStatus, { en: string; ar: string }> = {
  surplus: { en: "Surplus", ar: "فائض" },
  deficit: { en: "Deficit", ar: "عجز" },
  healthy: { en: "Healthy", ar: "سليم" },
};
