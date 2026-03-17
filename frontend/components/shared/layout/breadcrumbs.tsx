"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const SEGMENT_LABELS: Record<string, string> = {
  app: "",
  dashboard: "Dashboard",
  transactions: "Transactions",
  forecast: "Forecast",
  alerts: "Alerts",
  agents: "AI Agents",
  import: "Import",
  reports: "Reports",
  billing: "Billing",
  settings: "Settings",
  organization: "Organization",
  members: "Members",
  roles: "Roles",
  integrations: "Integrations",
  security: "Security",
  audit: "Audit Log",
  onboarding: "Onboarding",
  analytics: "Analytics",
  waterfall: "Cash Flow",
  budget: "Budget vs Actual",
  "project-cash-flow": "Project Cash Flow",
  "group-consolidation": "Group Consolidation",
  "risk-radar": "Risk Radar",
  "zakat-vat": "Tax Calendar",
};

const SEGMENT_LABELS_AR: Record<string, string> = {
  app: "",
  dashboard: "لوحة المعلومات",
  transactions: "المعاملات",
  forecast: "التوقعات",
  alerts: "التنبيهات",
  agents: "الوكلاء الذكيون",
  import: "استيراد",
  reports: "التقارير",
  billing: "الفوترة",
  settings: "الإعدادات",
  organization: "المنظمة",
  members: "الأعضاء",
  roles: "الأدوار",
  integrations: "التكاملات",
  security: "الأمان",
  audit: "سجل المراجعة",
  onboarding: "الإعداد",
  analytics: "التحليلات",
  waterfall: "التدفق النقدي",
  budget: "الميزانية مقابل الفعلي",
  "project-cash-flow": "تدفقات المشاريع",
  "group-consolidation": "دمج المجموعة",
  "risk-radar": "رادار المخاطر",
  "zakat-vat": "التقويم الضريبي",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  const isRtl = dir === "rtl";
  const labels = isAr ? SEGMENT_LABELS_AR : SEGMENT_LABELS;

  const segments = pathname?.split("/").filter(Boolean) ?? [];

  // Build crumbs: skip "app" prefix, skip dynamic segments (UUIDs)
  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    const isUuid = /^[0-9a-f-]{36}$/i.test(seg);
    const label = labels[seg];
    if (label === undefined && !isUuid) {
      // Unknown segment — show as-is (capitalized)
      crumbs.push({ label: seg.charAt(0).toUpperCase() + seg.slice(1), href: path });
    } else if (label) {
      crumbs.push({ label, href: path });
    }
  }

  if (crumbs.length === 0) return null;

  const Sep = isRtl ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <Sep className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
