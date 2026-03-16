"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  Search,
  LayoutDashboard,
  Banknote,
  TrendingUp,
  SlidersHorizontal,
  ShieldAlert,
  FolderKanban,
  GitMerge,
  ArrowUpRight,
  MessageCircle,
  Link2,
  Globe,
  ArrowLeftRight,
  Bell,
  FileText,
  Upload,
  Target,
  Calendar,
  CalendarDays,
  ShieldCheck,
  Newspaper,
  BarChart3,
  CheckSquare,
  Shield,
  FileBarChart,
  Plug,
  Flame,
  Settings2,
  Layers,
  Brain,
  Monitor,
  Bot,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useEntity } from "@/contexts/EntityContext";
import { useDemo } from "@/contexts/DemoContext";
import type { LucideIcon } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface NavItem {
  navKey: keyof Dictionary["nav"];
  icon: LucideIcon;
  href: string;
  highlighted?: boolean;
}

const LIQUIDITY_CORE: NavItem[] = [
  { navKey: "dashboard", icon: LayoutDashboard, href: "/liquidity/dashboard" },
  { navKey: "cashPositioning", icon: Banknote, href: "/liquidity/cash-position" },
  { navKey: "forecast13w", icon: TrendingUp, href: "/liquidity/forecast" },
  { navKey: "scenarioPlanner", icon: SlidersHorizontal, href: "/liquidity/scenario" },
  { navKey: "riskRadar", icon: ShieldAlert, href: "/liquidity/risk-radar" },
  { navKey: "projectCashFlow", icon: FolderKanban, href: "/liquidity/project-cash", highlighted: true },
  { navKey: "groupConsolidation", icon: GitMerge, href: "/liquidity/group-consolidation", highlighted: true },
  { navKey: "cashCalendar", icon: CalendarDays, href: "/liquidity/cash-calendar" },
  { navKey: "dailyBrief", icon: Newspaper, href: "/liquidity/daily-brief", highlighted: true },
  { navKey: "benchmark", icon: BarChart3, href: "/liquidity/industry-benchmark", highlighted: true },
  { navKey: "stressTesting", icon: Flame, href: "/liquidity/stress-testing", highlighted: true },
];

const OPERATIONS: NavItem[] = [
  { navKey: "payables", icon: ArrowUpRight, href: "/operations/payables" },
  { navKey: "cashCollect", icon: MessageCircle, href: "/operations/collections" },
  { navKey: "reconciliation", icon: Link2, href: "/operations/reconciliation" },
  { navKey: "fxRadar", icon: Globe, href: "/operations/fx-radar" },
];

const COMPLIANCE: NavItem[] = [
  { navKey: "transactions", icon: ArrowLeftRight, href: "/reports/transactions" },
  { navKey: "import", icon: Upload, href: "/reports/imports" },
  { navKey: "financialAnalysis", icon: BarChart3, href: "/reports/analysis" },
  { navKey: "alerts", icon: Bell, href: "/reports/alerts" },
  { navKey: "reports", icon: FileText, href: "/reports/reports" },
  { navKey: "budget", icon: Target, href: "/reports/budget-vs-actual" },
  { navKey: "zakatVat", icon: Calendar, href: "/reports/zakat-vat" },
  { navKey: "audit", icon: ShieldCheck, href: "/settings/audit-logs" },
];

const AI_ADVISOR: NavItem[] = [
  { navKey: "agents", icon: Bot, href: "/ai-advisor/agents" },
  { navKey: "chat", icon: MessageCircle, href: "/ai-advisor/chat" },
  { navKey: "documents", icon: FileText, href: "/ai-advisor/documents" },
];

const ENTERPRISE: NavItem[] = [
  { navKey: "approvals", icon: CheckSquare, href: "/enterprise/approval-center", highlighted: true },
  { navKey: "compliance", icon: Shield, href: "/enterprise/compliance-center", highlighted: true },
  { navKey: "executiveReport", icon: FileBarChart, href: "/enterprise/executive-report", highlighted: true },
  { navKey: "integrationsHub", icon: Plug, href: "/enterprise/integration-hub", highlighted: true },
  { navKey: "intercompanyNetting", icon: ArrowLeftRight, href: "/enterprise/intercompany-netting", highlighted: true },
  { navKey: "treasuryPolicies", icon: Settings2, href: "/enterprise/treasury-policies", highlighted: true },
  { navKey: "cashPooling", icon: Layers, href: "/enterprise/cash-pooling", highlighted: true },
  { navKey: "smartCategorization", icon: Brain, href: "/enterprise/categorization", highlighted: true },
  { navKey: "sessionManagement", icon: Monitor, href: "/enterprise/session-management", highlighted: true },
];

function EntityLabel() {
  const { locale } = useI18n();
  const { selectedId, selectedEntity } = useEntity();
  const isAr = locale === "ar";
  const label =
    selectedId === "consolidated"
      ? isAr ? "موحّد" : "Consolidated"
      : selectedEntity
        ? isAr ? selectedEntity.nameAr : selectedEntity.nameEn
        : "—";
  return (
    <span className="truncate max-w-[100px] text-xs text-muted-foreground font-medium">
      {label}
    </span>
  );
}

function NavSection({
  title,
  items,
  pathname,
  nav,
  open,
  onToggle,
  demoBasePath,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  nav: Dictionary["nav"];
  open: boolean;
  onToggle: () => void;
  demoBasePath: string | null;
}) {
  const resolveHref = (href: string) => href;
  const hasActive = items.some((item) => pathname === item.href || pathname === resolveHref(item.href));

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {title}
          {!open && hasActive && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </span>
        <ChevronLeft
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            open && "-rotate-90",
          )}
        />
      </button>
      {open &&
        items.map((item) => {
          const href = resolveHref(item.href);
          const active = pathname === href || pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors min-w-0",
                active
                  ? "bg-muted text-foreground font-semibold border-s-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                item.highlighted && !active && "border-s-2 border-emerald-500/50",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{nav[item.navKey]}</span>
            </Link>
          );
        })}
    </div>
  );
}

type SectionKey = "liquidity" | "operations" | "compliance" | "ai" | "enterprise";

export function Sidebar() {
  const pathname = usePathname();
  const { t, dir } = useI18n();
  const demo = useDemo();
  const demoBasePath = demo.isDemoMode ? `/demo/${demo.slug}` : null;
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    liquidity: true,
    operations: true,
    compliance: true,
    ai: true,
    enterprise: true,
  });

  const toggle = (key: SectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const agents = [
    { name: t.common.agentRaqib, color: "bg-emerald-500", badge: "Live", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", ping: true },
    { name: t.common.agentMutawaqi, color: "bg-indigo-500", badge: "94% Acc", badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400", ping: false },
    { name: t.common.agentMustashar, color: "bg-amber-500", badge: "Ready", badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", ping: false },
  ];

  return (
    <aside
      dir={dir}
      data-sidebar
      className="hidden md:flex flex-col w-[260px] border-e bg-card shrink-0 print:hidden overflow-hidden"
    >
      {/* ── Brand + Entity label (switcher is in navbar) ── */}
      <div className="flex h-14 items-center border-b px-3 gap-2.5 shrink-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white font-bold text-xs">
          T
        </div>
        <div className="flex flex-1 items-center justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">
              Tadfuq<span className="text-emerald-600">.ai</span>
            </p>
          </div>
          <EntityLabel />
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={t.common.searchOrAsk}
            className="w-full rounded-md border border-input bg-background pe-3 ps-9 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* ── AI Agents Panel ── */}
      <div className="px-3 pb-2 shrink-0">
        <div className="rounded-lg bg-muted/60 p-2.5 space-y-1.5">
          {agents.map((agent) => (
            <div key={agent.name} className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  {agent.ping && (
                    <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", agent.color)} />
                  )}
                  <span className={cn("relative inline-flex h-2 w-2 rounded-full", agent.color)} />
                </span>
                <span className="text-xs font-medium truncate">{agent.name}</span>
              </div>
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0", agent.badgeClass)}>
                {agent.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        <NavSection title={t.nav.sectionLiquidity} items={LIQUIDITY_CORE} pathname={pathname} nav={t.nav} open={openSections.liquidity} onToggle={() => toggle("liquidity")} demoBasePath={demoBasePath} />
        <NavSection title={t.nav.sectionOperations} items={OPERATIONS} pathname={pathname} nav={t.nav} open={openSections.operations} onToggle={() => toggle("operations")} demoBasePath={demoBasePath} />
        <NavSection title={t.nav.sectionCompliance} items={COMPLIANCE} pathname={pathname} nav={t.nav} open={openSections.compliance} onToggle={() => toggle("compliance")} demoBasePath={demoBasePath} />
        <NavSection title={t.nav.sectionAI} items={AI_ADVISOR} pathname={pathname} nav={t.nav} open={openSections.ai} onToggle={() => toggle("ai")} demoBasePath={demoBasePath} />
        <NavSection title={t.nav.sectionEnterprise} items={ENTERPRISE} pathname={pathname} nav={t.nav} open={openSections.enterprise} onToggle={() => toggle("enterprise")} demoBasePath={demoBasePath} />
      </nav>
    </aside>
  );
}
