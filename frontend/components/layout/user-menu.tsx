"use client";

import { Settings, CreditCard, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { locale } = useI18n();
  const router = useRouter();
  const isAr = locale === "ar";

  const displayName = isAr ? "مستخدم تجريبي" : "Demo User";
  const email = "demo@TadFuq.ai";
  const initials = "D";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent transition-colors outline-none">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="text-xs font-medium max-w-[100px] truncate">{displayName}</span>
            <span className="text-[10px] text-muted-foreground max-w-[100px] truncate">{email}</span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal py-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground truncate">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-xs cursor-pointer"
          onClick={() => router.push("/app/settings/organization")}
        >
          <Settings className="h-3.5 w-3.5" />
          {isAr ? "الإعدادات" : "Settings"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-xs cursor-pointer"
          onClick={() => router.push("/app/billing")}
        >
          <CreditCard className="h-3.5 w-3.5" />
          {isAr ? "الفوترة" : "Billing"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
