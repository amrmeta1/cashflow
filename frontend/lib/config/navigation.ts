import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  SlidersHorizontal,
  Bell,
  Bot,
  Upload,
  FileText,
  BarChart2,
  Target,
  Globe,
  ArrowUpRight,
  CreditCard,
  Receipt,
  MessageCircle,
  Link2,
  Building2,
  Landmark,
  Users,
  ShieldCheck,
  KeyRound,
  Plug,
  Banknote,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/api/types";

export type NavGroup = "csuite" | "ai" | "ops" | "settings";

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
  // ── C-Suite (الإدارة العليا) ──────────────────────────────────────────────
  {
    key: "dashboard",
    translationKey: "dashboard",
    href: "/liquidity/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ALL_ROLES,
    group: "csuite",
  },
  {
    key: "hq",
    translationKey: "hq",
    href: "/hq",
    icon: Building2,
    allowedRoles: ADMIN_OWNER,
    group: "csuite",
  },

  // ── AI Core (الذكاء المالي) ───────────────────────────────────────────────
  {
    key: "forecast",
    translationKey: "forecast",
    href: "/liquidity/forecast",
    icon: TrendingUp,
    allowedRoles: ALL_ROLES,
    group: "ai",
  },
  {
    key: "scenario-planner",
    translationKey: "scenarioPlanner",
    href: "/liquidity/scenario",
    icon: SlidersHorizontal,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "ai",
  },

  // ── Operations (العمليات) ─────────────────────────────────────────────────
  {
    key: "payables",
    translationKey: "payables",
    href: "/operations/payables",
    icon: ArrowUpRight,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "ops",
  },
  {
    key: "cash-collect",
    translationKey: "cashCollect",
    href: "/operations/collections",
    icon: MessageCircle,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "ops",
  },
  {
    key: "reconciliation",
    translationKey: "reconciliation",
    href: "/operations/reconciliation",
    icon: Link2,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "ops",
  },
  {
    key: "fx-radar",
    translationKey: "fxRadar",
    href: "/operations/fx-radar",
    icon: Globe,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "ops",
  },
  {
    key: "cash-positioning",
    translationKey: "cashPositioning",
    href: "/liquidity/cash-position",
    icon: Banknote,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "ops",
  },

  // ── Settings ─────────────────────────────────────────────────────────────
  {
    key: "transactions",
    translationKey: "transactions",
    href: "/reports/transactions",
    icon: ArrowLeftRight,
    allowedRoles: ALL_ROLES,
    group: "settings",
  },
  {
    key: "alerts",
    translationKey: "alerts",
    href: "/reports/alerts",
    icon: Bell,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "settings",
  },
  {
    key: "agents",
    translationKey: "agents",
    href: "/ai-advisor/agents",
    icon: Bot,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "settings",
  },
  {
    key: "import",
    translationKey: "import",
    href: "/reports/imports",
    icon: Upload,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "settings",
  },
  {
    key: "reports",
    translationKey: "reports",
    href: "/reports/reports",
    icon: FileText,
    allowedRoles: ALL_ROLES,
    group: "settings",
  },
  {
    key: "waterfall",
    translationKey: "waterfall",
    href: "/reports/budget-vs-actual",
    icon: BarChart2,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "settings",
  },
  {
    key: "budget",
    translationKey: "budget",
    href: "/reports/budget-vs-actual",
    icon: Target,
    allowedRoles: FINANCE_AND_ABOVE,
    group: "settings",
  },
  {
    key: "billing",
    translationKey: "billing",
    href: "/billing",
    icon: CreditCard,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "organization",
    translationKey: "organization",
    href: "/settings/organization",
    icon: Landmark,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "members",
    translationKey: "members",
    href: "/settings/members",
    icon: Users,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "roles",
    translationKey: "roles",
    href: "/settings/roles",
    icon: KeyRound,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "integrations",
    translationKey: "integrations",
    href: "/settings/integrations",
    icon: Plug,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "security",
    translationKey: "security",
    href: "/settings/security",
    icon: ShieldCheck,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
  {
    key: "audit",
    translationKey: "audit",
    href: "/settings/audit-logs",
    icon: ShieldCheck,
    allowedRoles: ADMIN_OWNER,
    group: "settings",
  },
];

export const NAV_GROUP_LABELS: Record<NavGroup, { en: string; ar: string }> = {
  csuite:   { en: "C-Suite",        ar: "الإدارة العليا" },
  ai:       { en: "AI Core",        ar: "الذكاء المالي" },
  ops:      { en: "Operations",     ar: "العمليات" },
  settings: { en: "More",           ar: "الإعدادات" },
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
