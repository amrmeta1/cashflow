export type PlanId = "starter" | "core" | "pro" | "enterprise";
export type InvoiceStatus = "paid" | "pending" | "failed";

export interface UsageMeter {
  key: string;
  label_en: string;
  label_ar: string;
  used: number;
  limit: number;
  icon_key: "bank" | "users" | "link" | "zap";
}

export interface Plan {
  id: PlanId;
  name_en: string;
  name_ar: string;
  price_usd: number | null;
  features_en: string[];
  features_ar: string[];
}

export interface Invoice {
  id: string;
  date: string;
  amount_usd: number;
  status: InvoiceStatus;
  description_en: string;
  description_ar: string;
}

export interface BillingData {
  current_plan: PlanId;
  renewal_date: string;
  usage: UsageMeter[];
  invoices: Invoice[];
}
