"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Button } from "@/components/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/shared/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { t, dir } = useI18n();
  const { visibleNav } = usePermissions();
  const isRtl = dir === "rtl";

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isRtl ? "right" : "left"}
          className="w-64 p-0 flex flex-col"
        >
          <SheetHeader className="flex h-12 items-center border-b px-4 shrink-0">
            <SheetTitle className="text-sm font-semibold">
              {t.common.appName}
            </SheetTitle>
          </SheetHeader>

          <SidebarNav
            items={[]}
            collapsed={false}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
