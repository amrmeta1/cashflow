"use client";

import { useDropzone } from "react-dropzone";
import {
  UploadCloud, Sparkles, ArrowRight, ArrowLeft,
  CheckCircle2, FileText, X, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/ui/toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCSVImport } from "@/features/import/use-csv-import";
import type { ImportRow } from "@/features/import/use-csv-import";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useQueryClient } from "@tanstack/react-query";
import { addImportedTransactions } from "@/features/transactions/mock-api";
import { runAnalysis } from "@/lib/api/ingestion-api";

// ── Review Table (State 4) ────────────────────────────────────────────────────

function ReviewTable({ rows, fmt, isAr, dir }: {
  rows: ImportRow[];
  fmt: (n: number) => string;
  isAr: boolean;
  dir: "ltr" | "rtl";
}) {
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const headers = isAr
    ? ["التاريخ", "النص الخام", "المورد (AI)", "الفئة", "الدقة", "المبلغ"]
    : ["Date", "Raw Bank Text", "AI Cleaned Vendor", "AI Category", "Confidence", "Amount"];

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 text-start text-xs font-medium text-muted-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2.5">
                <span className="tabular-nums text-xs text-muted-foreground whitespace-nowrap">{row.date}</span>
              </td>
              <td className="px-3 py-2.5 max-w-[200px]">
                <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded block truncate">
                  {row.rawText}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <Arrow className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-sm font-semibold whitespace-nowrap">{row.aiVendor}</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">{row.aiCategory}</Badge>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", row.aiConfidence >= 95 ? "bg-emerald-500" : "bg-amber-500")} />
                  <span className="text-xs font-medium tabular-nums">{row.aiConfidence}%</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-end">
                <span className={cn("tabular-nums text-sm font-semibold whitespace-nowrap", row.amount >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {row.amount >= 0 ? "+" : ""}{fmt(row.amount)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { locale, dir } = useI18n();
  const { toast } = useToast();
  const { fmt } = useCurrency();
  const router = useRouter();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const isAr = locale === "ar";

  const { stage, progress, terminalLine, fileName, rows, selectedFileSize, onDrop, startUploadFromSelection, handleReset } = useCSVImport();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls", ".xlsx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
    disabled: stage !== "idle",
  });

  const handleConfirm = () => {
    const tenantId = currentTenant?.id ?? "demo";
    addImportedTransactions(
      tenantId,
      rows.map((r) => ({
        date: r.date,
        rawText: r.rawText,
        amount: r.amount,
        currency: r.currency,
        aiVendor: r.aiVendor,
      }))
    );
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    toast({
      title: isAr ? "تم الاستيراد بنجاح" : "Import successful",
      description: isAr ? `تم حفظ ${rows.length} معاملة — تظهر في صفحة المعاملات` : `${rows.length} transactions saved — they appear on the Transactions page`,
      variant: "success",
    });
    runAnalysis(tenantId).catch(() => {});
    router.push(`/app/analysis?uploaded=true&count=${rows.length}&tenant=${tenantId}`);
  };

  return (
    <div dir={dir} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 md:p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          {/* ── Page header ── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h1 className="text-base font-semibold">
                {isAr ? "استيراد كشف الحساب بالذكاء الاصطناعي" : "Magic AI CSV Import"}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "يقوم مستشار AI بتنظيف وتصنيف معاملاتك تلقائيًا في ثوانٍ"
                : "Mustashar AI automatically cleans, categorizes, and maps your transactions in seconds"}
            </p>
          </div>

          {/* ── STATE 0: File selected (preview before upload) ── */}
          {stage === "file_selected" && (
            <Card className="p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <p className="text-sm font-medium">
                  {isAr ? "الملف جاهز للرفع" : "File ready to upload"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="font-mono">{fileName}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {selectedFileSize >= 1024
                      ? `${(selectedFileSize / 1024).toFixed(1)} KB`
                      : `${selectedFileSize} B`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isAr ? "سيتم التحليل تلقائياً بعد الرفع" : "Analysis will run automatically after upload"}
                </p>
                <Button className="gap-1.5" onClick={startUploadFromSelection}>
                  <UploadCloud className="h-3.5 w-3.5" />
                  {isAr ? "رفع وتحليل فوراً 🚀" : "Upload & analyze now 🚀"}
                </Button>
              </div>
            </Card>
          )}

          {/* ── STATE 1: Dropzone ── */}
          {stage === "idle" && (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all select-none",
                isDragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/30"
              )}
            >
              <input {...getInputProps()} />
              <UploadCloud className={cn(
                "h-12 w-12 mx-auto mb-4 transition-colors",
                isDragActive ? "text-primary" : "text-muted-foreground/40"
              )} />
              <p className="text-sm font-medium mb-1">
                {isDragActive
                  ? (isAr ? "أفلت الملف هنا" : "Drop your file here")
                  : (isAr ? "اسحب وأفلت كشف حسابك البنكي (CSV، Excel) هنا" : "Drag & drop your bank statement (CSV, Excel) here")}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {isAr
                  ? "سيقوم مستشار AI بتنظيف وتصنيف ورسم خريطة معاملاتك تلقائيًا في ثوانٍ"
                  : "Mustashar AI will automatically clean, categorize, and map your transactions in seconds"}
              </p>
              <div className="flex justify-center gap-1.5">
                {[".csv", ".xls", ".xlsx"].map((ext) => (
                  <Badge key={ext} variant="outline" className="text-[10px] font-mono">{ext}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* ── STATE 2: Uploading ── */}
          {stage === "uploading" && (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <span>{isAr ? `جارٍ رفع ${fileName}...` : `Uploading ${fileName}...`}</span>
              </div>
              <Progress value={Math.min(progress, 100)} className="w-full max-w-md h-2" />
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.min(Math.round(progress), 100)}%
              </span>
            </div>
          )}

          {/* ── STATE 3: Analyzing ── */}
          {stage === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <span>{isAr ? "مستشار AI يحلل معاملاتك..." : "Mustashar AI is analyzing your transactions..."}</span>
              </div>
              <Progress value={Math.min(progress, 100)} className="w-full max-w-md h-2" />
              <div className="w-full max-w-md h-4 overflow-hidden text-center">
                <p className="text-xs font-mono text-muted-foreground">{terminalLine}</p>
              </div>
            </div>
          )}

          {/* ── STATE 4: Review table ── */}
          {stage === "review" && rows.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-semibold">
                      {isAr ? "اكتمل التحليل — راجع النتائج" : "Analysis Complete — Review Results"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ms-6">
                    {isAr
                      ? `تم تحميل ${rows.length} معاملة من الملف`
                      : `${rows.length} transactions loaded from file`}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {isAr ? "إعادة" : "Reset"}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono">{fileName || "bank_statement.csv"}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {isAr ? `${rows.length} صفًا` : `${rows.length} rows`}
                </Badge>
              </div>

              <ReviewTable rows={rows} fmt={fmt} isAr={isAr} dir={dir as "ltr" | "rtl"} />

              <div className="bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-xs p-3 rounded-md flex items-start gap-2 border border-blue-100 dark:border-blue-900/50">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  {isAr
                    ? `البيانات المعروضة من ملفك (${rows.length} صف). التصنيف التلقائي والربط بالخادم متاحان عند تفعيل الخدمة.`
                    : `Data shown from your file (${rows.length} rows). Auto-categorization and server sync available when the service is enabled.`}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Sticky footer (review state only) ── */}
      {stage === "review" && (
        <div className="border-t bg-background/95 backdrop-blur px-5 md:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <p className="text-xs text-muted-foreground">
            {isAr ? "راجع البيانات أعلاه قبل الاستيراد" : "Review the data above before importing"}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleReset}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handleConfirm}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isAr ? "رفع وتحليل فوراً 🚀" : "Upload & analyze now 🚀"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
