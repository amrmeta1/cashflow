import type { Integration } from "./types";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: "csv",
    name_en: "CSV Import", name_ar: "استيراد CSV",
    description_en: "Upload bank statements in CSV format. Supports most GCC bank export formats.",
    description_ar: "رفع كشوف الحساب البنكية بصيغة CSV. يدعم معظم صيغ تصدير البنوك الخليجية.",
    category: "import", status: "connected", logo: "📄",
    last_sync_at: new Date(Date.now() - 2 * 3_600_000).toISOString(), enabled: true,
  },
  {
    id: "lean",
    name_en: "Lean Technologies", name_ar: "لين تكنولوجيز",
    description_en: "Open banking API for KSA & UAE. Real-time balance and transaction sync.",
    description_ar: "واجهة برمجة البنوك المفتوحة للسعودية والإمارات. مزامنة فورية للرصيد والمعاملات.",
    category: "bank", status: "coming_soon", logo: "🏦", enabled: false,
  },
  {
    id: "tarabut",
    name_en: "Tarabut Gateway", name_ar: "بوابة ترابط",
    description_en: "Open banking infrastructure for Bahrain, UAE, and KSA.",
    description_ar: "بنية تحتية للبنوك المفتوحة في البحرين والإمارات والسعودية.",
    category: "bank", status: "coming_soon", logo: "🔗", enabled: false,
  },
  {
    id: "quickbooks",
    name_en: "QuickBooks Online", name_ar: "كويك بوكس أونلاين",
    description_en: "Sync invoices, bills, and chart of accounts from QuickBooks Online.",
    description_ar: "مزامنة الفواتير والمصروفات ودليل الحسابات من كويك بوكس أونلاين.",
    category: "accounting", status: "disconnected", logo: "📊", enabled: false,
  },
  {
    id: "xero",
    name_en: "Xero", name_ar: "زيرو",
    description_en: "Connect Xero for automated reconciliation and P&L sync.",
    description_ar: "ربط زيرو للتسوية الآلية ومزامنة الأرباح والخسائر.",
    category: "accounting", status: "disconnected", logo: "📈", enabled: false,
  },
  {
    id: "wafeq",
    name_en: "Wafeq", name_ar: "وافق",
    description_en: "Saudi-compliant accounting with ZATCA e-invoicing support.",
    description_ar: "محاسبة متوافقة مع المتطلبات السعودية مع دعم فاتورة زاتكا.",
    category: "accounting", status: "coming_soon", logo: "🧾", enabled: false,
  },
];

export async function fetchIntegrations(): Promise<Integration[]> {
  await delay();
  return MOCK_INTEGRATIONS;
}

export async function apiToggleIntegration(
  id: string,
  enabled: boolean
): Promise<{ id: string; enabled: boolean }> {
  await delay();
  return { id, enabled };
}

export async function apiSyncIntegration(id: string): Promise<{ id: string }> {
  await delay(1000);
  return { id };
}

export async function apiConnectIntegration(id: string): Promise<{ id: string }> {
  await delay(800);
  return { id };
}
