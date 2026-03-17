"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Bell,
  ArrowLeftRight,
  Bot,
  Settings,
  Upload,
  FileText,
  FileDown,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/shared/ui/command";
import { useCommandMenu } from "@/lib/command-store";
import { useToast } from "@/components/shared/ui/toast";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// ── Open copilot with optional initial prompt ─────────────────────────────────

function openCopilotWithPrompt(prompt?: string) {
  window.dispatchEvent(
    new CustomEvent("open-mustashar-copilot", { detail: prompt ? { prompt } : {} })
  );
}

// ── Open report generate dialog ──────────────────────────────────────────────

function openReportDialog() {
  window.dispatchEvent(new CustomEvent("open-generate-report-dialog"));
}

// ── Export PDF: go to reports page ────────────────────────────────────────────

function openExportPdf(router: ReturnType<typeof useRouter>) {
  router.push("/reports/reports");
}

// ── Kbd helper ──────────────────────────────────────────────────────────────

function Kbd({ keys }: { keys: string[] }) {
  return (
    <span
      className={cn(
        "hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
        "ms-auto"
      )}
    >
      {keys.map((k) => (
        <kbd key={k}>{k}</kbd>
      ))}
    </span>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export function CommandPalette() {
  const { isOpen, close, open, toggle } = useCommandMenu();
  const router = useRouter();
  const { toast } = useToast();
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";

  const handleOpenChange = useCallback(
    (openState: boolean) => {
      if (!openState) close();
    },
    [close]
  );

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

  useEffect(() => {
    const handler = () => open();
    window.addEventListener("open-command-palette", handler);
    return () => window.removeEventListener("open-command-palette", handler);
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close]
  );

  const runAction = useCallback(
    (fn: () => void, toastTitle?: string) => {
      fn();
      if (toastTitle) {
        toast({ title: toastTitle, variant: "success" });
      }
      close();
    },
    [close, toast]
  );

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        "max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-2xl backdrop-blur-xl",
        "focus-visible:ring-2 focus-visible:ring-emerald-500/40",
        "[&_[cmdk-root]]:rounded-2xl [&_[cmdk-input-wrapper]]:border-white/10 [&_[cmdk-input-wrapper]]:bg-white/5",
        "[&_[cmdk-group-heading]]:text-emerald-400/90 [&_[cmdk-item][data-selected=true]]:bg-emerald-500/15 [&_[cmdk-item][data-selected=true]]:text-foreground"
      )}
    >
      <div dir={dir} className="flex flex-col">
        <CommandInput
          placeholder={isAr ? "اكتب أمرًا أو ابحث..." : "Type a command or search..."}
          className="placeholder:text-muted-foreground text-base"
        />
        <CommandList className="max-h-[min(70vh,420px)]">
          <CommandEmpty>
            {isAr ? "لا توجد نتائج." : "No results found."}
          </CommandEmpty>

          {/* ── Group 1: Navigation ── */}
          <CommandGroup heading={isAr ? "التنقل" : "Navigation"}>
            <CommandItem
              value="dashboard لوحة المعلومات dashboard"
              onSelect={() => navigate("/liquidity/dashboard")}
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <LayoutDashboard className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {isAr ? "لوحة المعلومات" : "Dashboard"}
              <Kbd keys={["G", "D"]} />
            </CommandItem>
            <CommandItem
              value="forecast صندوق السيناريوهات scenario"
              onSelect={() => navigate("/liquidity/forecast")}
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <TrendingUp className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {isAr ? "صندوق السيناريوهات" : "Forecast Sandbox"}
              <Kbd keys={["G", "F"]} />
            </CommandItem>
            <CommandItem
              value="alerts صندوق التنبيهات alerts inbox"
              onSelect={() => navigate("/reports/alerts")}
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <Bell className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {isAr ? "صندوق التنبيهات" : "Alerts Inbox"}
              <Kbd keys={["G", "A"]} />
            </CommandItem>
            <CommandItem
              value="transactions دفتر المعاملات ledger"
              onSelect={() => navigate("/reports/transactions")}
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <ArrowLeftRight className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {isAr ? "دفتر المعاملات" : "Transactions Ledger"}
              <Kbd keys={["G", "T"]} />
            </CommandItem>
            <CommandItem
              value="agents وكلاء الذكاء الاصطناعي AI"
              onSelect={() => navigate("/ai-advisor/agents")}
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <Bot className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {isAr ? "وكلاء الذكاء الاصطناعي" : "AI Agents"}
              <Kbd keys={["G", "I"]} />
            </CommandItem>
            <CommandItem
              value="settings الإعدادات organization"
              onSelect={() => navigate("/settings/organization")}
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <Settings className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {isAr ? "الإعدادات" : "Settings"}
              <Kbd keys={["G", "S"]} />
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="bg-white/10" />

          {/* ── Group 2: Quick Actions ── */}
          <CommandGroup heading={isAr ? "إجراءات سريعة" : "Quick Actions"}>
            <CommandItem
              value="import استيراد كشف حساب بنكي bank statement"
              onSelect={() =>
                runAction(() => navigate("/reports/imports"), isAr ? "تم الانتقال إلى الاستيراد" : "Redirecting to Import")
              }
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <Upload className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {isAr ? "استيراد كشف حساب بنكي" : "Import Bank Statement"}
            </CommandItem>
            <CommandItem
              value="report إنشاء تقرير شهري generate monthly report"
              onSelect={() => runAction(openReportDialog)}
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <FileText className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {isAr ? "إنشاء تقرير شهري" : "Generate Monthly Report"}
            </CommandItem>
            <CommandItem
              value="add transaction إضافة معاملة يدوية manual"
              onSelect={() =>
                runAction(
                  () => navigate("/reports/transactions"),
                  isAr ? "افتح دفتر المعاملات لإضافة معاملة" : "Open Transactions to add an entry"
                )
              }
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <PlusCircle className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {isAr ? "إضافة معاملة يدوية" : "Add Manual Transaction"}
            </CommandItem>
            <CommandItem
              value="export pdf تصدير تقرير PDF"
              onSelect={() =>
                runAction(
                  () => openExportPdf(router),
                  isAr ? "تم الانتقال إلى التقارير" : "Redirecting to Reports"
                )
              }
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <FileDown className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {isAr ? "تصدير تقرير PDF" : "Export Report PDF"}
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="bg-white/10" />

          {/* ── Group 3: AI Commands (close modal → open copilot with pre-filled prompt) ── */}
          <CommandGroup heading={isAr ? "أوامر الذكاء الاصطناعي" : "AI Commands"}>
            <CommandItem
              value="mustashar مستشار فتح محادثة open chat"
              onSelect={() => runAction(() => openCopilotWithPrompt())}
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <Sparkles className="me-2 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <span className="font-medium text-emerald-400">
                  {isAr ? "اسأل مستشار:" : "Ask Mustashar:"}
                </span>{" "}
                {isAr ? "فتح محادثة (اكتب سؤالك)" : "Open chat (type your question)"}
              </span>
            </CommandItem>
            <CommandItem
              value="raqib رقيب تحليل المصاريف analyze expenses"
              onSelect={() =>
                runAction(() =>
                  openCopilotWithPrompt(
                    isAr ? "تحليل المصاريف الأخيرة" : "Analyze recent expenses"
                  )
                )
              }
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <Sparkles className="me-2 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <span className="font-medium text-emerald-400">
                  {isAr ? "اسأل رقيب:" : "Ask Raqib:"}
                </span>{" "}
                {isAr ? "تحليل المصاريف الأخيرة" : "Analyze recent expenses"}
              </span>
            </CommandItem>
            <CommandItem
              value="mutawaqi متوقع محاكاة انخفاض الإيرادات simulate revenue"
              onSelect={() =>
                runAction(() =>
                  openCopilotWithPrompt(
                    isAr ? "محاكاة انخفاض الإيرادات ٢٠٪" : "Simulate a 20% revenue drop"
                  )
                )
              }
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <Sparkles className="me-2 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <span className="font-medium text-emerald-400">
                  {isAr ? "اسأل متوقع:" : "Ask Mutawaqi':"}
                </span>{" "}
                {isAr ? "محاكاة انخفاض الإيرادات" : "Simulate Revenue Drop"}
              </span>
            </CommandItem>
            <CommandItem
              value="mustashar مستشار تأجيل دفعة موردين postpone supplier"
              onSelect={() =>
                runAction(() =>
                  openCopilotWithPrompt(
                    isAr ? "هل يمكنني تأجيل دفعة الموردين؟" : "Can I postpone the supplier payment?"
                  )
                )
              }
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <Sparkles className="me-2 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <span className="font-medium text-emerald-400">
                  {isAr ? "اسأل مستشار:" : "Ask Mustashar:"}
                </span>{" "}
                {isAr ? "هل يمكنني تأجيل دفعة الموردين؟" : "Can I postpone the supplier payment?"}
              </span>
            </CommandItem>
            <CommandItem
              value="mustashar مستشار تأثير عقد جديد contract impact"
              onSelect={() =>
                runAction(() =>
                  openCopilotWithPrompt(
                    isAr ? "ما هو تأثير قبول العقد الجديد؟" : "What is the impact of accepting the new contract?"
                  )
                )
              }
              className="rounded-lg data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-foreground"
            >
              <Sparkles className="me-2 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <span className="font-medium text-emerald-400">
                  {isAr ? "اسأل مستشار:" : "Ask Mustashar:"}
                </span>{" "}
                {isAr ? "ما هو تأثير قبول العقد الجديد؟" : "What is the impact of accepting the new contract?"}
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
  );
}
