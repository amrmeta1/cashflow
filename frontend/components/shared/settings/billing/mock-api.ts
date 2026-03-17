import type { BillingData } from "./types";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export const MOCK_BILLING: BillingData = {
  current_plan: "core",
  renewal_date: "2025-03-01T00:00:00Z",
  usage: [
    { key: "bank_accounts", label_en: "Bank Accounts",    label_ar: "الحسابات البنكية",       used: 2,      limit: 5,      icon_key: "bank"  },
    { key: "members",       label_en: "Team Members",     label_ar: "أعضاء الفريق",           used: 4,      limit: 10,     icon_key: "users" },
    { key: "integrations",  label_en: "Integrations",     label_ar: "التكاملات",               used: 1,      limit: 3,      icon_key: "link"  },
    { key: "api_calls",     label_en: "API Calls (mo)",   label_ar: "استدعاءات API (شهريًا)", used: 18_420, limit: 50_000, icon_key: "zap"   },
  ],
  invoices: [
    { id: "inv-001", date: "2025-02-01T00:00:00Z", amount_usd: 299, status: "paid",    description_en: "Core Plan — February 2025",  description_ar: "خطة الأساسي — فبراير ٢٠٢٥"  },
    { id: "inv-002", date: "2025-01-01T00:00:00Z", amount_usd: 299, status: "paid",    description_en: "Core Plan — January 2025",   description_ar: "خطة الأساسي — يناير ٢٠٢٥"   },
    { id: "inv-003", date: "2024-12-01T00:00:00Z", amount_usd: 299, status: "paid",    description_en: "Core Plan — December 2024",  description_ar: "خطة الأساسي — ديسمبر ٢٠٢٤"  },
    { id: "inv-004", date: "2024-11-01T00:00:00Z", amount_usd: 149, status: "paid",    description_en: "Starter Plan — November 2024", description_ar: "خطة المبتدئ — نوفمبر ٢٠٢٤" },
  ],
};

export const PLANS = [
  {
    id: "starter" as const,
    name_en: "Starter", name_ar: "المبتدئ",
    price_usd: 149,
    features_en: ["1 bank account", "3 team members", "30-day forecast", "Email alerts"],
    features_ar: ["حساب بنكي واحد", "٣ أعضاء فريق", "توقعات ٣٠ يومًا", "تنبيهات بالبريد الإلكتروني"],
  },
  {
    id: "core" as const,
    name_en: "Core", name_ar: "الأساسي",
    price_usd: 299,
    features_en: ["5 bank accounts", "10 team members", "13-week forecast", "AI agents", "API access"],
    features_ar: ["٥ حسابات بنكية", "١٠ أعضاء فريق", "توقعات ١٣ أسبوعًا", "وكلاء ذكاء اصطناعي", "وصول API"],
  },
  {
    id: "pro" as const,
    name_en: "Pro", name_ar: "المتقدم",
    price_usd: 599,
    features_en: ["Unlimited accounts", "Unlimited members", "Custom scenarios", "Priority support", "SSO"],
    features_ar: ["حسابات غير محدودة", "أعضاء غير محدودين", "سيناريوهات مخصصة", "دعم أولوية", "SSO"],
  },
  {
    id: "enterprise" as const,
    name_en: "Enterprise", name_ar: "المؤسسي",
    price_usd: null,
    features_en: ["Everything in Pro", "Dedicated CSM", "SLA 99.9%", "Custom integrations", "On-premise option"],
    features_ar: ["كل ما في المتقدم", "مدير نجاح مخصص", "اتفاقية خدمة ٩٩٫٩٪", "تكاملات مخصصة", "خيار محلي"],
  },
];

export async function fetchBilling(): Promise<BillingData> {
  await delay();
  return MOCK_BILLING;
}
