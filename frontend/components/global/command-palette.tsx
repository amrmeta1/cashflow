"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, Bell, ArrowLeftRight,
  Bot, Settings, Upload, FileText, PlusCircle, Sparkles,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCommandMenu } from "@/lib/command-store";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/context";

// ── Kbd helper ──────────────────────────────────────────────────────────────

function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className="ms-auto hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {keys.map((k) => (
        <kbd key={k}>{k}</kbd>
      ))}
    </span>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export function CommandPalette() {
  const { isOpen, close, toggle } = useCommandMenu();
  const router = useRouter();
  const { toast } = useToast();
  const { locale } = useI18n();
  const isAr = locale === "ar";

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle]);

  const navigate = (href: string) => {
    router.push(href);
    close();
  };

  const action = (label: string, labelAr: string) => {
    toast({ title: isAr ? labelAr : label, variant: "success" });
    close();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(v) => (v ? undefined : close())}>
      <CommandInput
        placeholder={isAr ? "اكتب أمرًا أو ابحث..." : "Type a command or search..."}
      />
      <CommandList>
        <CommandEmpty>
          {isAr ? "لا توجد نتائج." : "No results found."}
        </CommandEmpty>

        {/* ── Group 1: Navigation ── */}
        <CommandGroup heading={isAr ? "التنقل" : "Navigation"}>
          <CommandItem onSelect={() => navigate("/app/dashboard")}>
            <LayoutDashboard className="me-2 h-4 w-4 text-muted-foreground" />
            {isAr ? "لوحة المعلومات" : "Dashboard"}
            <Kbd keys={["G", "D"]} />
          </CommandItem>
          <CommandItem onSelect={() => navigate("/app/forecast")}>
            <TrendingUp className="me-2 h-4 w-4 text-muted-foreground" />
            {isAr ? "صندوق السيناريوهات" : "Forecast Sandbox"}
            <Kbd keys={["G", "F"]} />
          </CommandItem>
          <CommandItem onSelect={() => navigate("/app/alerts")}>
            <Bell className="me-2 h-4 w-4 text-muted-foreground" />
            {isAr ? "صندوق التنبيهات" : "Alerts Inbox"}
            <Kbd keys={["G", "A"]} />
          </CommandItem>
          <CommandItem onSelect={() => navigate("/app/transactions")}>
            <ArrowLeftRight className="me-2 h-4 w-4 text-muted-foreground" />
            {isAr ? "دفتر المعاملات" : "Transactions Ledger"}
            <Kbd keys={["G", "T"]} />
          </CommandItem>
          <CommandItem onSelect={() => navigate("/app/agents")}>
            <Bot className="me-2 h-4 w-4 text-muted-foreground" />
            {isAr ? "وكلاء الذكاء الاصطناعي" : "AI Agents"}
            <Kbd keys={["G", "I"]} />
          </CommandItem>
          <CommandItem onSelect={() => navigate("/app/settings/organization")}>
            <Settings className="me-2 h-4 w-4 text-muted-foreground" />
            {isAr ? "الإعدادات" : "Settings"}
            <Kbd keys={["G", "S"]} />
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ── Group 2: Quick Actions ── */}
        <CommandGroup heading={isAr ? "إجراءات سريعة" : "Quick Actions"}>
          <CommandItem
            onSelect={() =>
              action("Redirecting to Import…", "جارٍ الانتقال إلى الاستيراد…")
            }
          >
            <Upload className="me-2 h-4 w-4 text-muted-foreground" />
            {isAr ? "استيراد كشف حساب بنكي" : "Import Bank Statement"}
          </CommandItem>
          <CommandItem
            onSelect={() =>
              action("Generating monthly report…", "جارٍ إنشاء التقرير الشهري…")
            }
          >
            <FileText className="me-2 h-4 w-4 text-muted-foreground" />
            {isAr ? "إنشاء تقرير شهري" : "Generate Monthly Report"}
          </CommandItem>
          <CommandItem
            onSelect={() =>
              action("Action initiated…", "تم بدء الإجراء…")
            }
          >
            <PlusCircle className="me-2 h-4 w-4 text-muted-foreground" />
            {isAr ? "إضافة معاملة يدوية" : "Add Manual Transaction"}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ── Group 3: AI Commands ── */}
        <CommandGroup heading={isAr ? "أوامر الذكاء الاصطناعي" : "AI Commands"}>
          <CommandItem
            onSelect={() =>
              action("Raqib is analyzing expenses…", "رقيب يحلل المصاريف…")
            }
          >
            <Sparkles className="me-2 h-4 w-4 text-primary" />
            <span>
              <span className="font-medium text-primary">
                {isAr ? "اسأل رقيب:" : "Ask Raqib:"}
              </span>{" "}
              {isAr ? "تحليل المصاريف الأخيرة" : "Analyze recent expenses"}
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              action("Mutawaqi' is running simulation…", "متوقع يشغّل المحاكاة…")
            }
          >
            <Sparkles className="me-2 h-4 w-4 text-primary" />
            <span>
              <span className="font-medium text-primary">
                {isAr ? "اسأل متوقع:" : "Ask Mutawaqi':"}
              </span>{" "}
              {isAr ? "محاكاة انخفاض الإيرادات" : "Simulate Revenue Drop"}
            </span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
