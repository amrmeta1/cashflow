/**
 * Cash Position display types (frontend-only; not all fields from API yet).
 * Backend can later map to these shapes.
 */

export type AccountType = "Operating" | "Payroll" | "Tax" | "Escrow";

export type LiquidityBucketKey = "available" | "in_transit" | "restricted";

export interface EntityRow {
  entityId?: string;
  name: string;
  currency: string;
  balance: number;
  pctOfTotal: number;
}

export interface BankAccountRow {
  accountId: string;
  bankName?: string;
  name: string;
  accountType: AccountType;
  currency: string;
  balance: number;
  pctOfTotal: number;
}

export interface LiquidityRow {
  bucket: LiquidityBucketKey;
  label: string;
  balance: number;
  pctOfTotal: number;
}

export interface CashPositionBreakdown {
  byEntity: EntityRow[];
  byBank: BankAccountRow[];
  byLiquidity: LiquidityRow[];
}

export interface CashPositionExplanationItem {
  accountId: string;
  name: string;
  currency: string;
  balance: number;
}

export interface CashPositionRecentTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export interface CashPositionExplanation {
  totalCash: number;
  primaryCurrency: string;
  usdEquivalent?: number;
  composition: CashPositionExplanationItem[];
  recentTransactions: CashPositionRecentTransaction[];
}
