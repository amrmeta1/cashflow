/**
 * Mock data for development when backend endpoints are not yet available.
 * Gated behind NEXT_PUBLIC_ENABLE_MOCKS=true
 */

import { getDemoMockOptions } from "@/lib/demo-mock-store";

export const MOCKS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_MOCKS === "true";

export const DEV_SKIP_AUTH =
  process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true";

// ── Dev skip-login: mock tenant list (no backend) ─────────────
import type { Tenant, AuditLog, SystemStatus, TreasurySettings } from "./types";

/** Default tenant for development when none is set (uses a fixed UUID for consistency). */
const now = new Date().toISOString();
export const DEMO_TENANT: Tenant = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Demo",
  slug: "demo",
  plan: "starter",
  status: "active",
  metadata: null,
  created_at: now,
  updated_at: now,
};

export function getMockTenantList(companyName?: string): { data: Tenant[]; meta: { total: number; limit: number; offset: number } } {
  const name = companyName?.trim() || "Demo";
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  // Generate a deterministic UUID based on slug for demo tenants
  const generateDemoUUID = (slug: string): string => {
    if (!slug || slug === "demo") return DEMO_TENANT.id;
    // Simple deterministic UUID generation for demo purposes
    const hash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hex = hash.toString(16).padStart(8, '0').slice(0, 8);
    return `${hex}-0000-0000-0000-000000000001`;
  };
  
  const tenant: Tenant = companyName
    ? { ...DEMO_TENANT, id: generateDemoUUID(slug), name, slug: slug || "demo" }
    : DEMO_TENANT;
  return {
    data: [tenant],
    meta: { total: 1, limit: 20, offset: 0 },
  };
}

// ── Forecast ─────────────────────────────────────────────────

function generateForecastData(days: number, scenario: string) {
  const base = 250_000;
  const multiplier = scenario === "optimistic" ? 1.15 : scenario === "pessimistic" ? 0.85 : 1;
  const data = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const noise = (Math.random() - 0.5) * 20_000;
    const trend = i * 800 * multiplier;
    data.push({
      date: d.toISOString().slice(0, 10),
      projected: Math.round(base + trend + noise),
      upper: Math.round(base + trend + noise + 15_000),
      lower: Math.round(base + trend + noise - 15_000),
    });
  }
  return data;
}

export function getMockForecast(range: string, scenario: string) {
  const days = range === "13w" ? 91 : 30;
  return {
    data: {
      range,
      scenario,
      currency: "SAR",
      points: generateForecastData(days, scenario),
    },
  };
}

// ── Alerts ────────────────────────────────────────────────────

const MOCK_ALERTS = [
  {
    id: "alert-1",
    severity: "high" as const,
    title: "Cash balance projected below floor",
    description: "Based on current burn rate, cash will drop below SAR 50,000 floor in 12 days.",
    status: "open" as const,
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
    explanation: "Your average daily expenses are SAR 8,500 while average daily collections are SAR 6,200. At this rate, the projected balance in 12 days will be SAR 42,000 — below your configured floor of SAR 50,000.",
    recommended_action: "Follow up on outstanding invoices totaling SAR 45,000 (3 invoices overdue by 15+ days). Consider delaying non-critical vendor payments.",
    related_entities: [{ type: "invoice", id: "INV-2024-087" }, { type: "invoice", id: "INV-2024-091" }],
  },
  {
    id: "alert-2",
    severity: "medium" as const,
    title: "Unusual expense detected",
    description: "A payment of SAR 32,000 to an unrecognized counterparty was detected.",
    status: "open" as const,
    created_at: new Date(Date.now() - 8 * 3600_000).toISOString(),
    explanation: "This payment to 'XYZ Trading LLC' is 4x your typical transaction amount with this counterparty and was not matched to any purchase order.",
    recommended_action: "Verify this transaction with your finance team. Mark as expected if it's a legitimate payment.",
    related_entities: [{ type: "transaction", id: "txn-abc-123" }],
  },
  {
    id: "alert-3",
    severity: "low" as const,
    title: "Collection delay increasing",
    description: "Average days sales outstanding (DSO) increased from 28 to 35 days this month.",
    status: "acknowledged" as const,
    created_at: new Date(Date.now() - 24 * 3600_000).toISOString(),
    explanation: "3 of your top 5 clients have been paying later than usual. This trend may impact cash flow projections.",
    recommended_action: "Review payment terms with clients. Consider offering early payment discounts.",
    related_entities: [],
  },
  {
    id: "alert-4",
    severity: "high" as const,
    title: "Bank account sync failed",
    description: "Connection to Al Rajhi Bank account ending in 4521 has been failing for 48 hours.",
    status: "resolved" as const,
    created_at: new Date(Date.now() - 48 * 3600_000).toISOString(),
    explanation: "The bank API returned authentication errors. This may be due to expired credentials.",
    recommended_action: "Re-authenticate your bank connection in Settings > Integrations.",
    related_entities: [{ type: "bank_account", id: "ba-001" }],
  },
];

function applyCompanyToAlerts(companyName: string) {
  return MOCK_ALERTS.map((a) => ({
    ...a,
    description: a.description.replace("Based on current burn rate", `Based on ${companyName}'s current burn rate`),
    explanation: a.explanation.replace("Your average", `${companyName}'s average`),
  }));
}

export function getMockAlerts() {
  const opts = getDemoMockOptions();
  const data = opts ? applyCompanyToAlerts(opts.companyName) : MOCK_ALERTS;
  return { data, meta: { total: data.length, limit: 20, offset: 0 } };
}

export function getMockAlert(id: string) {
  const opts = getDemoMockOptions();
  const list = opts ? applyCompanyToAlerts(opts.companyName) : MOCK_ALERTS;
  const alert = list.find((a) => a.id === id);
  if (!alert) return null;
  return { data: alert };
}

// ── Audit logs (for demo tenant) ───────────────────────────────

export function getMockAuditLogs(): AuditLog[] {
  const now = new Date();
  return [
    { id: "al-1", tenant_id: "demo", actor_sub: "user-demo@example.com", action: "login", entity_type: "session", entity_id: "sess-1", metadata: null, ip_address: "127.0.0.1", user_agent: "Mozilla/5.0", occurred_at: new Date(now.getTime() - 3600_000).toISOString() },
    { id: "al-2", tenant_id: "demo", actor_sub: "user-demo@example.com", action: "member.invite", entity_type: "membership", entity_id: "mem-1", metadata: null, ip_address: "127.0.0.1", user_agent: "Mozilla/5.0", occurred_at: new Date(now.getTime() - 7200_000).toISOString() },
    { id: "al-3", tenant_id: "demo", actor_sub: "user-demo@example.com", action: "tenant.update", entity_type: "tenant", entity_id: "demo", metadata: null, ip_address: "127.0.0.1", user_agent: "Mozilla/5.0", occurred_at: new Date(now.getTime() - 86400_000).toISOString() },
  ];
}

// ── Agents ────────────────────────────────────────────────────

export function getMockAgentsStatus() {
  return {
    data: [
      {
        id: "raqib",
        name_en: "Raqib",
        name_ar: "رقيب",
        role_en: "Monitoring Agent",
        role_ar: "وكيل المراقبة",
        description_en: "Continuously monitors cash flows, detects anomalies, and triggers alerts in real-time.",
        description_ar: "يراقب التدفقات النقدية باستمرار، ويكشف الشذوذ، ويطلق التنبيهات في الوقت الفعلي.",
        status: "active" as const,
        last_run: new Date(Date.now() - 300_000).toISOString(),
        next_run: new Date(Date.now() + 300_000).toISOString(),
      },
      {
        id: "mutawaqi",
        name_en: "Mutawaqi'",
        name_ar: "متوقع",
        role_en: "Forecasting Agent",
        role_ar: "وكيل التنبؤ",
        description_en: "Generates 13-week and 30-day cash forecasts using ML models and scenario analysis.",
        description_ar: "يولّد توقعات نقدية لـ 13 أسبوعًا و30 يومًا باستخدام نماذج التعلم الآلي وتحليل السيناريوهات.",
        status: "active" as const,
        last_run: new Date(Date.now() - 3600_000).toISOString(),
        next_run: new Date(Date.now() + 3600_000).toISOString(),
      },
      {
        id: "mustashar",
        name_en: "Mustashar",
        name_ar: "مستشار",
        role_en: "Decision Agent",
        role_ar: "وكيل القرار",
        description_en: "Provides actionable recommendations for cash management decisions and generates the daily brief.",
        description_ar: "يقدم توصيات قابلة للتنفيذ لقرارات إدارة النقد ويُعدّ الملخص اليومي.",
        status: "inactive" as const,
        last_run: new Date(Date.now() - 86400_000).toISOString(),
        next_run: null,
      },
    ],
  };
}

export function getMockDailyBrief() {
  const opts = getDemoMockOptions();
  const name = opts?.companyName || "Your company";
  return {
    data: {
      date: new Date().toISOString().slice(0, 10),
      greeting_en: `Good morning! Here's ${name}'s daily cash brief.`,
      greeting_ar: `صباح الخير! إليك الملخص النقدي اليومي لـ ${name}.`,
      items: [
        { icon: "💰", text_en: "Current balance: SAR 287,450", text_ar: "الرصيد الحالي: ٢٨٧,٤٥٠ ر.س" },
        { icon: "📈", text_en: "Expected inflows today: SAR 15,000 from 2 invoices", text_ar: "التدفقات المتوقعة اليوم: ١٥,٠٠٠ ر.س من فاتورتين" },
        { icon: "📉", text_en: "Scheduled payments: SAR 8,200 (rent + utilities)", text_ar: "المدفوعات المجدولة: ٨,٢٠٠ ر.س (إيجار + مرافق)" },
        { icon: "⚠️", text_en: "Action needed: 2 invoices overdue by 10+ days (SAR 22,000)", text_ar: "إجراء مطلوب: فاتورتان متأخرتان أكثر من ١٠ أيام (٢٢,٠٠٠ ر.س)" },
        { icon: "🔮", text_en: "13-week forecast: Stable with SAR 310,000 projected end balance", text_ar: "توقعات ١٣ أسبوعًا: مستقر مع رصيد متوقع ٣١٠,٠٠٠ ر.س" },
      ],
    },
  };
}

// ── Reports ───────────────────────────────────────────────────

export function getMockReports() {
  const opts = getDemoMockOptions();
  const prefix = opts?.companyName ? `${opts.companyName} — ` : "";
  return {
    data: [
      { id: "rep-2024-01", title: `${prefix}January 2024 Cash Report`, period: "2024-01", status: "ready" as const, created_at: "2024-02-01T08:00:00Z" },
      { id: "rep-2024-02", title: `${prefix}February 2024 Cash Report`, period: "2024-02", status: "ready" as const, created_at: "2024-03-01T08:00:00Z" },
      { id: "rep-2024-03", title: `${prefix}March 2024 Cash Report`, period: "2024-03", status: "generating" as const, created_at: "2024-04-01T08:00:00Z" },
    ],
    meta: { total: 3, limit: 20, offset: 0 },
  };
}

export function getMockReport(id: string) {
  const opts = getDemoMockOptions();
  const titlePrefix = opts?.companyName ? `${opts.companyName} — ` : "";
  return {
    data: {
      id,
      title: `${titlePrefix}Monthly Cash Flow Report`,
      period: "2024-02",
      status: "ready" as const,
      created_at: "2024-03-01T08:00:00Z",
      narrative: "Cash position remained stable throughout February. Total inflows of SAR 420,000 against outflows of SAR 385,000 resulted in a net positive cash flow of SAR 35,000. Key highlights include timely collection of 85% of outstanding invoices and controlled expense management.",
      summary: {
        opening_balance: 252_000,
        closing_balance: 287_000,
        total_inflows: 420_000,
        total_outflows: 385_000,
        net_change: 35_000,
      },
      chart_data: Array.from({ length: 28 }, (_, i) => ({
        date: `2024-02-${String(i + 1).padStart(2, "0")}`,
        balance: 252_000 + Math.round(i * 1250 + (Math.random() - 0.3) * 5000),
      })),
    },
  };
}

// ── System Status ─────────────────────────────────────────────
export function getMockSystemStatus(): SystemStatus {
  return {
    services: [
      {
        name: "API Gateway",
        status: "operational",
        response_time_ms: 45,
        last_check: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
      {
        name: "Database",
        status: "operational",
        response_time_ms: 12,
        last_check: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      },
      {
        name: "Authentication Service",
        status: "operational",
        response_time_ms: 78,
        last_check: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      },
      {
        name: "Ingestion Service",
        status: "operational",
        response_time_ms: 156,
        last_check: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      },
      {
        name: "Forecast Engine",
        status: "operational",
        response_time_ms: 234,
        last_check: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ],
    uptime_percentage: 99.97,
    uptime_days: 127,
    last_backup: {
      timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      status: "success",
      size_mb: 2847.56,
    },
  };
}

// ── Treasury Settings ─────────────────────────────────────────
export function getMockTreasurySettings(): TreasurySettings {
  return {
    minimum_cash_floor: 500000,
    liquidity_multiplier: 1.5,
    burn_spike_multiplier: 2.0,
    revenue_drop_threshold: 15,
    volatility_threshold: 0.25,
    updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updated_by: "admin@demo.com",
  };
}
