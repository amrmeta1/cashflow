"use client";

import React from "react";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud, Sparkles, ArrowRight, ArrowLeft,
  CheckCircle2, FileText, X, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import { Progress } from "@/components/shared/ui/progress";
import { Badge } from "@/components/shared/ui/badge";
import { Card, CardContent } from "@/components/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/shared/ui/toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCSVImport } from "@/components/reports/imports/use-csv-import";
import type { ImportRow } from "@/components/reports/imports/use-csv-import";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { getBankAccounts, type BankAccount } from "@/lib/api/operations-api";

// ── Category List ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "revenue", labelEn: "Revenue", labelAr: "إيرادات" },
  { value: "salary", labelEn: "Salary", labelAr: "رواتب" },
  { value: "rent", labelEn: "Rent", labelAr: "إيجار" },
  { value: "marketing", labelEn: "Marketing", labelAr: "تسويق" },
  { value: "infra", labelEn: "Infrastructure", labelAr: "بنية تحتية" },
  { value: "telecom", labelEn: "Telecom", labelAr: "اتصالات" },
  { value: "vendor", labelEn: "Vendor", labelAr: "مورد" },
  { value: "transfer", labelEn: "Transfer", labelAr: "تحويل" },
  { value: "tax", labelEn: "Tax", labelAr: "ضريبة" },
  { value: "other", labelEn: "Other", labelAr: "أخرى" },
];

// ── Review Table (State 4) ────────────────────────────────────────────────────

function ReviewTable({ rows, fmt, isAr, dir, onCategoryChange }: {
  rows: ImportRow[];
  fmt: (n: number) => string;
  isAr: boolean;
  dir: "ltr" | "rtl";
  onCategoryChange: (rowId: string, category: string) => void;
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
                <Select
                  value={row.aiCategory.toLowerCase()}
                  onValueChange={(val) => onCategoryChange(row.id, val)}
                >
                  <SelectTrigger className="h-7 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-xs">
                        {isAr ? cat.labelAr : cat.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [editedRows, setEditedRows] = React.useState<Map<string, { originalCategory: string; originalVendor: string }>>(new Map());

  // Fetch bank accounts
  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts", currentTenant?.id],
    queryFn: () => getBankAccounts(currentTenant?.id ?? "demo"),
    enabled: !!currentTenant?.id,
  });

  const { stage, progress, terminalLine, fileName, rows, selectedFileSize, onDrop, startUploadFromSelection, handleReset, updateRowCategory } = useCSVImport();

  // Track category changes for vendor learning
  const handleCategoryChange = (rowId: string, newCategory: string) => {
    const row = rows.find(r => r.id === rowId);
    if (row) {
      // Store original values if this is the first edit
      if (!editedRows.has(rowId)) {
        setEditedRows(prev => {
          const newMap = new Map(prev);
          newMap.set(rowId, {
            originalCategory: row.aiCategory,
            originalVendor: row.aiVendor,
          });
          return newMap;
        });
      }
    }
    updateRowCategory(rowId, newCategory);
  };

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

  const handleConfirm = async () => {
    const tenantId = currentTenant?.id ?? "demo";
    
    if (!selectedAccountId) {
      toast({
        title: isAr ? "الرجاء اختيار حساب بنكي" : "Please select a bank account",
        description: isAr ? "يجب اختيار حساب بنكي قبل الاستيراد" : "You must select a bank account before importing",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Import via JSON API (structured data after AI review)
      const { importBankJSON } = await import('@/lib/api/operations-api');
      
      const payload = {
        account_id: selectedAccountId,
        transactions: rows.map(r => ({
          date: r.date,
          amount: r.amount,
          currency: r.currency,
          description: r.aiVendor || r.rawText.substring(0, 100), // Cleaned description
          raw_text: r.rawText, // Original bank text
          counterparty: r.aiVendor,
          category: r.aiCategory.toLowerCase(),
          ai_vendor: r.aiVendor,
          ai_confidence: r.aiConfidence,
        })),
      };
      
      const result = await importBankJSON(tenantId, payload);
      
      // Create vendor rules for edited rows (user corrections)
      const { createVendorRule } = await import('@/lib/api/operations-api');
      for (const row of rows) {
        const editInfo = editedRows.get(row.id);
        if (editInfo) {
          // User edited this row - create a learning rule
          try {
            await createVendorRule(tenantId, {
              pattern: row.rawText,
              vendor_name: row.aiVendor,
              category: row.aiCategory.toLowerCase(),
            });
          } catch (error) {
            console.error('Failed to create vendor rule:', error);
            // Don't fail the entire import if rule creation fails
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["analysis-latest"] });
      queryClient.invalidateQueries({ queryKey: ["forecast"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      queryClient.invalidateQueries({ queryKey: ["cash-story"] });
      queryClient.invalidateQueries({ queryKey: ["daily-brief"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-rules"] });
      
      const importedCount = result.imported || 0;
      const duplicatesCount = result.duplicates || 0;
      const errorsCount = result.errors || 0;
      
      // Build detailed message
      const detailsAr = [
        `✅ ${importedCount} معاملة تم استيرادها`,
        duplicatesCount > 0 ? `⏭️ ${duplicatesCount} مكررة تم تخطيها` : null,
        errorsCount > 0 ? `⚠️ ${errorsCount} خطأ` : null,
      ].filter(Boolean).join('\n');
      
      const detailsEn = [
        `✅ ${importedCount} transactions imported`,
        duplicatesCount > 0 ? `⏭️ ${duplicatesCount} duplicates skipped` : null,
        errorsCount > 0 ? `⚠️ ${errorsCount} errors` : null,
      ].filter(Boolean).join('\n');
      
      toast({
        title: isAr ? "اكتمل الاستيراد" : "Import Complete",
        description: isAr ? detailsAr : detailsEn,
        variant: importedCount > 0 ? "success" : "destructive",
      });
      
      router.push(`/reports/analysis?uploaded=true&count=${importedCount}`);
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: isAr ? "فشل الاستيراد" : "Import failed",
        description: isAr ? "حدث خطأ أثناء حفظ البيانات. تأكد من وجود حساب بنكي." : "Error saving data. Make sure a bank account exists.",
        variant: "destructive",
      });
    }
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

              {/* Bank Account Selector */}
              <Card className="p-4 bg-muted/30">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    {isAr ? "اختر الحساب البنكي" : "Select Bank Account"}
                  </label>
                  <Select value={selectedAccountId || ""} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isAr ? "اختر حساب..." : "Select account..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {accountsLoading ? (
                        <SelectItem value="loading" disabled>
                          {isAr ? "جاري التحميل..." : "Loading..."}
                        </SelectItem>
                      ) : bankAccounts.length === 0 ? (
                        <SelectItem value="no-accounts" disabled>
                          {isAr ? "لا توجد حسابات" : "No accounts found"}
                        </SelectItem>
                      ) : (
                        bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.nickname} ({account.currency})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {!selectedAccountId && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {isAr ? "⚠️ يجب اختيار حساب بنكي قبل الاستيراد" : "⚠️ You must select a bank account before importing"}
                    </p>
                  )}
                </div>
              </Card>

              <ReviewTable rows={rows} fmt={fmt} isAr={isAr} dir={dir as "ltr" | "rtl"} onCategoryChange={handleCategoryChange} />

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
            <Button 
              size="sm" 
              className="gap-1.5" 
              onClick={handleConfirm}
              disabled={!selectedAccountId}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isAr ? "رفع وتحليل فوراً 🚀" : "Upload & analyze now 🚀"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
