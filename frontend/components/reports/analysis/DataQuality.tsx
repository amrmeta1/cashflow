"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { Progress } from "@/components/shared/ui/progress";
import { CheckCircle2, AlertCircle, XCircle, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/lib/hooks/use-tenant";
import { getDataQuality } from "@/lib/api/analysis-enhancements-api";

interface DataQualityMetrics {
  overall_score: number;
  total_transactions: number;
  ai_classified: number;
  vendors_identified: number;
  unclassified: number;
  missing_vendors: number;
}

interface DataQualityProps {
  metrics?: DataQualityMetrics;
  isLoading?: boolean;
}

function getQualityLevel(score: number): { label: string; labelAr: string; color: string; icon: any } {
  if (score >= 90) {
    return {
      label: "Excellent",
      labelAr: "ممتاز",
      color: "text-emerald-600",
      icon: CheckCircle2,
    };
  } else if (score >= 75) {
    return {
      label: "Good",
      labelAr: "جيد",
      color: "text-blue-600",
      icon: CheckCircle2,
    };
  } else if (score >= 60) {
    return {
      label: "Fair",
      labelAr: "مقبول",
      color: "text-yellow-600",
      icon: AlertCircle,
    };
  } else {
    return {
      label: "Poor",
      labelAr: "ضعيف",
      color: "text-red-600",
      icon: XCircle,
    };
  }
}

export function DataQuality({ metrics, isLoading }: DataQualityProps) {
  const { t, dir } = useI18n();
  const isAr = dir === "rtl";
  const { currentTenant } = useTenant();

  // Fetch real data from API
  const { data: apiMetrics, isLoading: apiLoading } = useQuery({
    queryKey: ["data-quality", currentTenant?.id],
    queryFn: () => getDataQuality(currentTenant?.id || ""),
    enabled: !!currentTenant?.id && !metrics,
  });

  const loading = isLoading || apiLoading;

  // Mock data for demo
  const mockMetrics: DataQualityMetrics = {
    overall_score: 94,
    total_transactions: 156,
    ai_classified: 156,
    vendors_identified: 142,
    unclassified: 0,
    missing_vendors: 14,
  };

  const displayMetrics = metrics || apiMetrics || mockMetrics;
  const qualityLevel = getQualityLevel(displayMetrics.overall_score);
  const QualityIcon = qualityLevel.icon;

  const classificationRate = Math.round(
    (displayMetrics.ai_classified / displayMetrics.total_transactions) * 100
  );
  const vendorRate = Math.round(
    (displayMetrics.vendors_identified / displayMetrics.total_transactions) * 100
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QualityIcon className={cn("h-5 w-5", qualityLevel.color)} />
            <CardTitle className="text-base">
              {isAr ? "جودة البيانات" : "Data Quality"}
            </CardTitle>
          </div>
          <Badge variant="outline" className={cn("text-sm font-semibold", qualityLevel.color)}>
            {displayMetrics.overall_score}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Overall Quality */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isAr ? "التقييم العام" : "Overall Quality"}
                </span>
                <span className={cn("font-semibold", qualityLevel.color)}>
                  {isAr ? qualityLevel.labelAr : qualityLevel.label}
                </span>
              </div>
              <Progress value={displayMetrics.overall_score} className="h-2" />
            </div>

            {/* AI Classification */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {displayMetrics.ai_classified === displayMetrics.total_transactions ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="text-sm font-medium">
                    {isAr ? "تصنيف AI" : "AI Classification"}
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {displayMetrics.ai_classified}/{displayMetrics.total_transactions}
                </span>
              </div>
              <Progress value={classificationRate} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? `${classificationRate}% من المعاملات مصنفة تلقائياً`
                  : `${classificationRate}% of transactions classified`}
              </p>
            </div>

            {/* Vendor Identification */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {displayMetrics.missing_vendors === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="text-sm font-medium">
                    {isAr ? "تحديد الموردين" : "Vendor Identification"}
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {displayMetrics.vendors_identified}/{displayMetrics.total_transactions}
                </span>
              </div>
              <Progress value={vendorRate} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? `${vendorRate}% من المعاملات لها موردين محددين`
                  : `${vendorRate}% of transactions have identified vendors`}
              </p>
            </div>

            {/* Unclassified Transactions */}
            {displayMetrics.unclassified > 0 && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">
                        {isAr ? "معاملات غير مصنفة" : "Unclassified Transactions"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {displayMetrics.unclassified}{" "}
                        {isAr ? "معاملة تحتاج مراجعة" : "transactions need review"}
                      </p>
                    </div>
                  </div>
                  <Link href="/reports/transactions">
                    <Button size="sm" variant="outline" className="gap-1">
                      {isAr ? "مراجعة" : "Review"}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Missing Vendors */}
            {displayMetrics.missing_vendors > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {isAr ? "موردين غير محددين" : "Missing Vendors"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {displayMetrics.missing_vendors}{" "}
                      {isAr ? "معاملة بدون مورد" : "transactions without vendor"}
                    </p>
                  </div>
                </div>
                <Link href="/reports/transactions">
                  <Button size="sm" variant="outline" className="gap-1">
                    {isAr ? "تحديد" : "Identify"}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Perfect Score Message */}
            {displayMetrics.overall_score === 100 && (
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {isAr
                      ? "🎉 جميع البيانات مصنفة بشكل كامل!"
                      : "🎉 All data is fully classified!"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
