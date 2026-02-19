"use client";

import { Search } from "lucide-react";
import { TenantSwitcher } from "./tenant-switcher";
import { LanguageToggle } from "./language-toggle";
import { UserMenu } from "./user-menu";
import { MobileSidebar } from "./mobile-sidebar";
import { Breadcrumbs } from "./breadcrumbs";
import { DarkModeToggle } from "./dark-mode-toggle";
import { NotificationBell } from "./notification-bell";
import { useCommandMenu } from "@/lib/command-store";

function SearchTrigger() {
  const { open } = useCommandMenu();
  return (
    <button
      onClick={open}
      className="hidden md:flex items-center w-full max-w-[220px] bg-muted/50 hover:bg-muted border border-border text-muted-foreground rounded-md px-3 py-1.5 text-xs transition-colors gap-2"
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-start truncate">Search or jump to...</span>
      <kbd className="ms-auto hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  );
}

export function Navbar() {
  return (
    <header data-navbar className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 print:hidden">
      <MobileSidebar />
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Breadcrumbs />
        <SearchTrigger />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <TenantSwitcher />
        <LanguageToggle />
        <DarkModeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
