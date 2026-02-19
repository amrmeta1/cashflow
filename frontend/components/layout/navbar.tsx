"use client";

import { TenantSwitcher } from "./tenant-switcher";
import { LanguageToggle } from "./language-toggle";
import { UserMenu } from "./user-menu";
import { MobileSidebar } from "./mobile-sidebar";
import { Breadcrumbs } from "./breadcrumbs";
import { DarkModeToggle } from "./dark-mode-toggle";
import { NotificationBell } from "./notification-bell";

export function Navbar() {
  return (
    <header data-navbar className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 print:hidden">
      <MobileSidebar />
      <div className="flex-1 min-w-0">
        <Breadcrumbs />
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
