import type { WaterfallBar, MonthlyTrend, BudgetLine, BudgetPeriod } from "./types";
import { CATEGORIES } from "../../reports/transactions/types";
import type { Category } from "../../reports/transactions/types";

function delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Waterfall ────────────────────────────────────────────────────────────────
const CATEGORY_INFLOWS: Partial<Record<Category, number>> = {
  Revenue: 320000,
  Dividends: 45000,
};

const CATEGORY_OUTFLOWS: Partial<Record<Category, number>> = {
  Payroll: 180000,
  Rent: 42000,
  Utilities: 18000,
  Supplies: 24000,
  Marketing: 31000,
  Travel: 12000,
  Software: 9500,
  Tax: 28000,
  Insurance: 14000,
  "Loan Repayment": 35000,
  Other: 8500,
};

export async function fetchWaterfallData(_tenantId?: string): Promise<WaterfallBar[]> {
  await delay();
  return CATEGORIES.map((cat) => {
    const inflow = CATEGORY_INFLOWS[cat] ?? 0;
    const outflow = CATEGORY_OUTFLOWS[cat] ?? 0;
    return { category: cat, inflow, outflow, net: inflow - outflow };
  }).filter((b) => b.inflow > 0 || b.outflow > 0);
}

// ── Monthly trend ────────────────────────────────────────────────────────────
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export async function fetchMonthlyTrend(
  _tenantId?: string,
  months = 6,
  locale = "en"
): Promise<MonthlyTrend[]> {
  await delay();
  const now = new Date();
  const result: MonthlyTrend[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const inflow = Math.round((Math.random() * 120000 + 280000) * 100) / 100;
    const outflow = Math.round((Math.random() * 80000 + 200000) * 100) / 100;
    const labels = locale === "ar" ? MONTHS_AR : MONTHS_EN;
    result.push({
      month: labels[d.getMonth()],
      inflow,
      outflow,
      net: inflow - outflow,
    });
  }
  return result;
}

// ── Budget vs Actual ─────────────────────────────────────────────────────────
const BUDGET_MAP: Partial<Record<Category, number>> = {
  Payroll: 175000,
  Rent: 40000,
  Utilities: 20000,
  Supplies: 22000,
  Marketing: 35000,
  Travel: 15000,
  Software: 10000,
  Tax: 25000,
  Insurance: 14000,
  "Loan Repayment": 35000,
  Other: 10000,
};

const ACTUAL_MAP: Partial<Record<Category, number>> = {
  Payroll: 180000,
  Rent: 42000,
  Utilities: 18000,
  Supplies: 24000,
  Marketing: 31000,
  Travel: 12000,
  Software: 9500,
  Tax: 28000,
  Insurance: 14000,
  "Loan Repayment": 35000,
  Other: 8500,
};

let _budgets = { ...BUDGET_MAP };

export async function fetchBudgetVsActual(_tenantId?: string): Promise<BudgetLine[]> {
  await delay();
  return (Object.keys(_budgets) as Category[]).map((cat, i) => {
    const budget = _budgets[cat] ?? 0;
    const actual = ACTUAL_MAP[cat] ?? 0;
    const variance = actual - budget;
    const variancePct = budget > 0 ? (variance / budget) * 100 : 0;
    return { id: `budget-${i}`, category: cat, budget, actual, variance, variancePct };
  });
}

export async function updateBudget(category: Category, budget: number): Promise<void> {
  await delay(300);
  _budgets[category] = budget;
}

export function getAvailablePeriods(): BudgetPeriod[] {
  const now = new Date();
  const periods: BudgetPeriod[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return periods;
}
