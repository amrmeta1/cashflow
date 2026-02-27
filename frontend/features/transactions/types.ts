export type TransactionType = "inflow" | "outflow" | "transfer";

export type TransactionStatus = "cleared" | "pending" | "reconciled";

export type TrustScore = "A+" | "B" | "C" | "F";

export interface Counterparty {
  name: string;
  type: "client" | "vendor";
  aiTrustScore?: TrustScore;
  averageDelayDays?: number;
  aiInsight?: string;
  aiInsightAr?: string;
}

export const CATEGORIES = [
  "Revenue",
  "Payroll",
  "Rent",
  "Utilities",
  "Supplies",
  "Marketing",
  "Travel",
  "Software",
  "Tax",
  "Insurance",
  "Loan Repayment",
  "Dividends",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Transaction {
  id: string;
  tenant_id: string;
  txn_date: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  counterparty: Counterparty;
  category: Category;
  account_id: string;
  account_name: string;
  reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionFilters {
  search?: string;
  category?: Category | "";
  type?: TransactionType | "";
  status?: TransactionStatus | "";
  from?: string;
  to?: string;
  account_id?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateTransactionPayload {
  category?: Category;
  description?: string;
  notes?: string;
  status?: TransactionStatus;
}

export interface BulkRecategorizePayload {
  ids: string[];
  category: Category;
}
