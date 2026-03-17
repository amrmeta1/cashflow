/**
 * Map API CashPositionResponse into breakdown views for the UI.
 * TODO: Replace derived/placeholder logic with real API fields when available
 * (entity, accountType, liquidityBucket).
 */

import type { CashPositionResponse } from "@/lib/api/types";
import type {
  EntityRow,
  BankAccountRow,
  LiquidityRow,
  AccountType,
} from "./types";

const ACCOUNT_TYPE_KEYWORDS: { keyword: string; type: AccountType }[] = [
  { keyword: "payroll", type: "Payroll" },
  { keyword: "salary", type: "Payroll" },
  { keyword: "رواتب", type: "Payroll" },
  { keyword: "tax", type: "Tax" },
  { keyword: "vat", type: "Tax" },
  { keyword: "ضريبة", type: "Tax" },
  { keyword: "escrow", type: "Escrow" },
  { keyword: "ضمان", type: "Escrow" },
];

function inferAccountType(name: string): AccountType {
  const lower = name.toLowerCase();
  for (const { keyword, type } of ACCOUNT_TYPE_KEYWORDS) {
    if (lower.includes(keyword)) return type;
  }
  return "Operating";
}

/**
 * By Entity / Country / Legal unit.
 * TODO: Replace with entity from API when available (entityId, country).
 */
export function mapToBreakdownByEntity(
  data: CashPositionResponse | null
): EntityRow[] {
  if (!data?.totals?.byCurrency?.length) return [];

  const total = data.totals.byCurrency.reduce((s, c) => s + c.balance, 0);
  if (total === 0) return [];

  return data.totals.byCurrency.map((c) => ({
    name: c.currency === "SAR" ? "Consolidated" : `Consolidated (${c.currency})`,
    currency: c.currency,
    balance: c.balance,
    pctOfTotal: (c.balance / total) * 100,
  }));
}

/**
 * By Bank / Account type.
 * TODO: Use real accountType from API when available; bank name from provider/nickname.
 */
export function mapToBreakdownByBank(
  data: CashPositionResponse | null
): BankAccountRow[] {
  if (!data?.accounts?.length) return [];

  const total = data.accounts.reduce((s, a) => s + a.balance, 0);

  return data.accounts.map((acc) => ({
    accountId: acc.accountId,
    bankName: undefined,
    name: acc.name,
    accountType: inferAccountType(acc.name),
    currency: acc.currency,
    balance: acc.balance,
    pctOfTotal: total !== 0 ? (acc.balance / total) * 100 : 0,
  }));
}

/**
 * By Liquidity bucket.
 * TODO: Use account tags or backend liquidity buckets when available.
 */
export function mapToBreakdownByLiquidity(
  data: CashPositionResponse | null
): LiquidityRow[] {
  if (!data) return [];

  const total = data.accounts?.reduce((s, a) => s + a.balance, 0) ?? 0;

  return [
    {
      bucket: "available",
      label: "Available now",
      balance: total,
      pctOfTotal: total !== 0 ? 100 : 0,
    },
    {
      bucket: "in_transit",
      label: "In transit / pending",
      balance: 0,
      pctOfTotal: 0,
    },
    {
      bucket: "restricted",
      label: "Restricted / ring-fenced",
      balance: 0,
      pctOfTotal: 0,
    },
  ];
}
