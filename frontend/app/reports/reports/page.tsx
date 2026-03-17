"use client";

import { useState } from "react";
import { Printer, Link2, FileText } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/shared/ui/select";
import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useToast } from "@/components/shared/ui/toast";
import { A4ReportDocument } from "@/components/reports/reports/A4ReportDocument";

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIODS = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"] as const;
type Period = typeof PERIODS[number];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { locale, dir } = useI18n();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const isAr = locale === "ar";

  const [period, setPeriod] = useState<Period>("Q1 2026");

  const company = currentTenant?.name ?? "TechCorp L.L.C";

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    toast({
      title: isAr ? "تم نسخ الرابط" : "Link copied to clipboard",
      variant: "success",
    });
  };

  return (
    <div
      dir={dir}
      className="bg-zinc-100 dark:bg-zinc-950 min-h-full py-10 print:bg-white print:py-0 overflow-y-auto"
    >
      {/* ── Action bar (screen only) ── */}
      <div className="print:hidden mb-8 max-w-[210mm] mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold">
            {isAr ? "تقارير مجلس الإدارة التنفيذية" : "Executive Board Reports"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Share link */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleShare}
          >
            <Link2 className="h-3.5 w-3.5" />
            {isAr ? "مشاركة" : "Share"}
          </Button>

          {/* Export / Print */}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
            {isAr ? "🖨️ تصدير PDF / طباعة" : "🖨️ Export PDF / Print"}
          </Button>
        </div>
      </div>

      {/* ── A4 Document ── */}
      <A4ReportDocument
        companyName={company}
        period={period}
        isAr={isAr}
      />

      {/* Bottom breathing room (screen only) */}
      <div className="print:hidden h-16" />
    </div>
  );
}
