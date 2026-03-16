import type { Category } from "@/components/reports/transactions/types";

export interface WaterfallBar {
  category: Category;
  inflow: number;
  outflow: number;
  net: number;
}

export interface MonthlyTrend {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface BudgetLine {
  id: string;
  category: Category;
  budget: number;
  actual: number;
  variance: number;
  variancePct: number;
}

export interface BudgetPeriod {
  year: number;
  month: number;
  label: string;
}
