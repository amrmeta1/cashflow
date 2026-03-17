"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { FileText, Upload, Calendar, DollarSign, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/lib/hooks/use-tenant";
import { getStatementHistory, type StatementHistoryItem as APIStatementHistoryItem } from "@/lib/api/analysis-enhancements-api";

interface StatementRecord {
  id: string;
  bank_type: string;
  file_name: string;
  imported_at: string;
  transaction_count: number;
  total_amount: number;
  currency: string;
}

interface StatementHistoryProps {
  statements?: StatementRecord[];
  isLoading?: boolean;
}

const BANK_NAMES: Record<string, { ar: string; en: string; color: string }> = {
  qnb: { ar: "بنك قطر الوطني", en: "Qatar National Bank", color: "bg-red-50 text-red-700 border-red-200" },
  hsbc: { ar: "بنك HSBC", en: "HSBC Bank", color: "bg-blue-50 text-blue-700 border-blue-200" },
  qib: { ar: "بنك قطر الإسلامي", en: "Qatar Islamic Bank", color: "bg-green-50 text-green-700 border-green-200" },
  doha: { ar: "بنك الدوحة", en: "Doha Bank", color: "bg-purple-50 text-purple-700 border-purple-200" },
  csv: { ar: "ملف CSV", en: "CSV File", color: "bg-gray-50 text-gray-700 border-gray-200" },
  excel: { ar: "ملف Excel", en: "Excel File", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function formatTimeAgo(dateString: string, isAr: boolean): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return isAr ? `منذ ${diffMins} دقيقة` : `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return isAr ? `منذ ${diffHours} ساعة` : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return isAr ? `منذ ${diffDays} يوم` : `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString(isAr ? "ar-QA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

function formatAmount(amount: number, currency: string, isAr: boolean): string {
  const formatted = new Intl.NumberFormat(isAr ? "ar-QA" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  return `${formatted} ${currency}`;
}

export function StatementHistory({ statements, isLoading }: StatementHistoryProps) {
  const { t, dir } = useI18n();
  const isAr = dir === "rtl";
  const { currentTenant } = useTenant();

  // Fetch real data from API
  const { data: apiStatements, isLoading: apiLoading } = useQuery({
    queryKey: ["statement-history", currentTenant?.id],
    queryFn: () => getStatementHistory(currentTenant?.id || ""),
    enabled: !!currentTenant?.id && !statements,
  });

  const loading = isLoading || apiLoading;

  // Mock data for demo
  const mockStatements: StatementRecord[] = [
    {
      id: "1",
      bank_type: "qnb",
      file_name: "Account_Statement_12_2022.pdf",
      imported_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
      transaction_count: 156,
      total_amount: 2500000,
      currency: "QAR",
    },
    {
      id: "2",
      bank_type: "qnb",
      file_name: "Account_Statement_11_2022.pdf",
      imported_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
      transaction_count: 142,
      total_amount: 2100000,
      currency: "QAR",
    },
    {
      id: "3",
      bank_type: "csv",
      file_name: "transactions_oct_2022.csv",
      imported_at: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
      transaction_count: 98,
      total_amount: 1850000,
      currency: "QAR",
    },
  ];

  // Use provided statements, or API data, or mock data as fallback
  const displayStatements = statements && statements.length > 0 
    ? statements 
    : apiStatements && apiStatements.length > 0 
    ? apiStatements.map(s => ({
        id: s.id,
        bank_type: s.bank_type,
        file_name: s.file_name,
        imported_at: s.imported_at,
        transaction_count: s.transaction_count,
        total_amount: s.total_amount,
        currency: s.currency,
      }))
    : mockStatements;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {isAr ? "سجل الكشوفات البنكية" : "Statement History"}
            </CardTitle>
          </div>
          <Link href="/reports/imports">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {isAr ? "استيراد كشف جديد" : "Import New"}
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : displayStatements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">
              {isAr ? "لا توجد كشوفات مستوردة" : "No statements imported yet"}
            </p>
            <Link href="/reports/imports">
              <Button size="sm" className="mt-3 gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                {isAr ? "استيراد أول كشف" : "Import First Statement"}
              </Button>
            </Link>
          </div>
        ) : (
          displayStatements.map((statement) => {
            const bankInfo = BANK_NAMES[statement.bank_type.toLowerCase()] || BANK_NAMES.csv;
            const bankName = isAr ? bankInfo.ar : bankInfo.en;

            return (
              <div
                key={statement.id}
                className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn("text-[10px]", bankInfo.color)}>
                        {statement.bank_type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {statement.file_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatTimeAgo(statement.imported_at, isAr)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>
                          {statement.transaction_count} {isAr ? "معاملة" : "transactions"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatAmount(statement.total_amount, statement.currency, isAr)}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{bankName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                      <span className="text-lg">✅</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
