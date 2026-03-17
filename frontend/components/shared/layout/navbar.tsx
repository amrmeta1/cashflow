"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { EntitySwitcher } from "./EntitySwitcher";
import { LanguageToggle } from "./language-toggle";
import { UserMenu } from "./user-menu";
import { MobileSidebar } from "./mobile-sidebar";
import { NotificationBell } from "./notification-bell";
import { DarkModeToggle } from "./dark-mode-toggle";
import { useCommandMenu } from "@/lib/command-store";
import { CurrencySelector } from "./CurrencySelector";
import { ConsolidatedViewCard } from "./ConsolidatedViewCard";
import { useI18n } from "@/lib/i18n/context";
import { useDemo } from "@/contexts/DemoContext";
import { cn } from "@/lib/utils";

function SearchTrigger() {
  const { open } = useCommandMenu();
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <button
      onClick={open}
      className={cn(
        "flex items-center w-full max-w-full min-w-0 flex-1 rounded-lg border bg-muted/40 hover:bg-muted/70",
        "border-border/80 hover:border-emerald-500/40 focus-within:border-emerald-500/50",
        "px-4 py-2.5 gap-3 transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-2 focus:ring-offset-background",
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-start text-sm text-muted-foreground truncate">
        {isAr ? "بحث أو انتقل إلى..." : "Search or jump to..."}
      </span>
      <kbd className="hidden sm:inline-flex h-6 items-center gap-0.5 rounded border border-border/80 bg-background px-2 font-mono text-[10px] font-medium text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  );
}

export function Navbar() {
  const { dir } = useI18n();
  const demo = useDemo();

  return (
    <header
      data-navbar
      dir={dir}
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 print:hidden",
        "gap-6 md:gap-8",
      )}
    >
      <MobileSidebar />

      {/* ── Left: Logo + Entity Switcher ── */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <Link
          href={demo.isDemoMode ? `/demo/${demo.slug}/dashboard` : "/liquidity/dashboard"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-colors"
        >
          T
        </Link>
        <span className="hidden sm:inline text-sm font-semibold text-foreground whitespace-nowrap">
          Tadfuq<span className="text-emerald-600">.ai</span>
        </span>
        <div className="hidden sm:block shrink-0 min-w-0">
          <EntitySwitcher compact />
        </div>
      </div>

      {/* ── Center: Wide search ── */}
      <div className="flex-1 flex items-center min-w-0 max-w-2xl mx-auto w-full">
        <SearchTrigger />
      </div>

      {/* ── Right: Demo CTA, Currency, Consolidated card, Notifications, Language, User ── */}
      <div className="flex items-center gap-2 shrink-0">
        {demo.isDemoMode && (
          <Link
            href={`/onboarding?from=demo&company=${encodeURIComponent(demo.companyName)}&industry=${encodeURIComponent(demo.industry)}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
              "bg-emerald-600 text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background",
              "transition-colors shadow-sm",
            )}
          >
            ابدأ الربط الحقيقي الآن
          </Link>
        )}
        <CurrencySelector />
        <div className="hidden lg:block">
          <ConsolidatedViewCard />
        </div>
        <NotificationBell />
        <LanguageToggle />
        <DarkModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
