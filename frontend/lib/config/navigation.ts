import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Bell,
  Bot,
  Upload,
  FileText,
  BarChart2,
  Target,
  Globe,
  Boxes,
  CreditCard,
  Receipt,
  Building2,
  Landmark,
  Users,
  ShieldCheck,
  KeyRound,
  Plug,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/api/types";

export type NavGroup = "main" | "analytics" | "settings";

export interface NavItem {
  key: string;
  translationKey: keyof typeof import("@/lib/i18n/dictionaries").dictionaries.en.nav;
  href: string;
  icon: LucideIcon;
  allowedRoles: Role[];
  group: NavGroup;
  featureFlag?: string;
}

const ALL_ROLES: Role[] = ["tenant_admin", "owner", "finance_manager", "accountant_readonly"];
const ADMIN_OWNER: Role[] = ["tenant_admin", "owner"];
const FINANCE_AND_ABOVE: Role[] = ["tenant_admin", "owner", "finance_manager"];

export const NAV_ITEMS: NavItem[] = [
  // ── HQ (CEO Master View) ─────────────────────────────────────────────────
  {
    key: "hq",
    translationKey: "hq",
    href: "/app/hq",
    icon: Landmark,
    allowedRoles: ADMIN_OWNER,
    group: "main",
  },

  // ── Main ────────────────────────────────────────────────────────────────
  {
    key: "dashboard",
    translationKey: "dashboard",
    href: "/app/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ALL_ROLES,
    group: "main",
  },
  {
    key: "transactions",
    translationKey: "transactions",
    href: "/app/transactions",
    icon: ArrowLeftRight,
    allowedRoles: ALL_ROLES,
    group: "main",
  },
  {
    key: "payables",
    translationKey: "payables",
    href: "/app/payables",
    icon: Receipt,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "main",
  },
  {
    key: "forecast",
    translationKey: "forecast",
    href: "/app/forecast",
    icon: TrendingUp,
    allowedRoles: ALL_ROLES,
    group: "main",
  },
  {
    key: "alerts",
    translationKey: "alerts",
    href: "/app/alerts",
    icon: Bell,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "main",
  },
  {
    key: "agents",
    translationKey: "agents",
    href: "/app/agents",
    icon: Bot,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "main",
  },
  {
    key: "import",
    translationKey: "import",
    href: "/app/import",
    icon: Upload,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "main",
  },
  {
    key: "reports",
    translationKey: "reports",
    href: "/app/reports",
    icon: FileText,
    allowedRoles: ALL_ROLES,
    group: "main",
  },

  // ── Analytics ────────────────────────────────────────────────────────────
  {
    key: "waterfall",
    translationKey: "waterfall",
    href: "/app/analytics/waterfall",
    icon: BarChart2,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "analytics",
  },
  {
    key: "fx-radar",
    translationKey: "fxRadar",
    href: "/app/fx-radar",
    icon: Globe,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "analytics",
  },
  {
    key: "budget",
    translationKey: "budget",
    href: "/app/analytics/budget",
    icon: Target,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "analytics",
  },
  {
    key: "scenario-planner",
    translationKey: "scenarioPlanner",
    href: "/app/scenario-planner",
    icon: Boxes,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "analytics",
  },

  // ── Settings ─────────────────────────────────────────────────────────────
  {
    key: "billing",
    translationKey: "billing",
    href: "/app/billing",
    icon: CreditCard,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "organization",
    translationKey: "organization",
    href: "/app/settings/organization",
    icon: Building2,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "members",
    translationKey: "members",
    href: "/app/settings/members",
    icon: Users,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "roles",
    translationKey: "roles",
    href: "/app/settings/roles",
    icon: KeyRound,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "integrations",
    translationKey: "integrations",
    href: "/app/settings/integrations",
    icon: Plug,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "security",
    translationKey: "security",
    href: "/app/settings/security",
    icon: ShieldCheck,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "audit",
    translationKey: "audit",
    href: "/app/audit",
    icon: ShieldCheck,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
];

export const NAV_GROUP_LABELS: Record<NavGroup, { en: string; ar: string }> = {
  main: { en: "Main", ar: "الرئيسية" },
  analytics: { en: "Analytics", ar: "التحليلات" },
  settings: { en: "Settings", ar: "الإعدادات" },
};

export function filterNavByRoles(roles: string[]): NavItem[] {
  if (!roles.length) return [];
  return NAV_ITEMS.filter((item) =>
    item.allowedRoles.some((r) => roles.includes(r))
  );
}

export function canAccessRoute(roles: string[], href: string): boolean {
  const item = NAV_ITEMS.find(
    (n) => href === n.href || href.startsWith(n.href + "/")
  );
  if (!item) return true;
  return item.allowedRoles.some((r) => roles.includes(r));
}
