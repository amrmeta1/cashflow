// ── Shared types for Budget Heatmap feature ───────────────────────────────────

export interface BudgetTransaction {
  id: string;
  description: string;
  description_ar: string;
  amount: number;
}

export interface Department {
  id: string;
  name: string;
  name_ar: string;
  budget: number;
  actual: number;
  transactions?: BudgetTransaction[];
  aiInsight?: string;
  aiInsight_ar?: string;
}

export type SpendStatus = "safe" | "warning" | "danger";

export function getSpendStatus(pct: number): SpendStatus {
  if (pct > 100) return "danger";
  if (pct > 16.6) return "warning";
  return "safe";
}

export const STATUS_BAR_COLOR: Record<SpendStatus, string> = {
  safe: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-destructive",
};

export const STATUS_BORDER_COLOR: Record<SpendStatus, string> = {
  safe: "border-s-emerald-500",
  warning: "border-s-amber-500",
  danger: "border-s-destructive",
};

// ── Mock data ─────────────────────────────────────────────────────────────────

export const DEPARTMENTS: Department[] = [
  {
    id: "d1",
    name: "Engineering & Cloud",
    name_ar: "الهندسة والسحابة",
    budget: 850_000,
    actual: 120_000,
  },
  {
    id: "d2",
    name: "Payroll & HR",
    name_ar: "الرواتب والموارد البشرية",
    budget: 400_000,
    actual: 120_000,
  },
  {
    id: "d3",
    name: "Marketing & Growth",
    name_ar: "التسويق والنمو",
    budget: 80_000,
    actual: 92_000,
    transactions: [
      { id: "t1", description: "Google Ads Q1", description_ar: "إعلانات جوجل الربع الأول", amount: 45_000 },
      { id: "t2", description: "Meta Campaign", description_ar: "حملة ميتا", amount: 30_000 },
      { id: "t3", description: "Event Sponsorship", description_ar: "رعاية الفعاليات", amount: 17_000 },
    ],
    aiInsight:
      "Mustashar AI Alert: Marketing exceeded the Q1 budget by SAR 12,000 due to 'Event Sponsorship'. Recommend reallocating SAR 15,000 from the under-utilized Legal budget to cover the deficit.",
    aiInsight_ar:
      "تنبيه مستشار AI: تجاوز التسويق ميزانية الربع الأول بمقدار SAR 12,000 بسبب 'رعاية الفعاليات'. يُوصى بإعادة تخصيص SAR 15,000 من ميزانية الشؤون القانونية غير المستغلة لتغطية العجز.",
  },
  {
    id: "d4",
    name: "Legal & Admin",
    name_ar: "الشؤون القانونية والإدارية",
    budget: 50_000,
    actual: 5_000,
  },
];
