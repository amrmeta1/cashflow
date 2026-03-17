"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Building2, TrendingDown, Lightbulb, DollarSign, CreditCard, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/lib/hooks/use-tenant";
import { getBankInsights } from "@/lib/api/analysis-enhancements-api";

interface BankInsight {
  id: string;
  type: "fee" | "transaction" | "recommendation" | "pattern";
  title: string;
  titleAr: string;
  value: string;
  valueAr: string;
  description?: string;
  descriptionAr?: string;
  impact?: string;
  impactAr?: string;
}

interface BankInsightsProps {
  bankType?: string;
  insights?: BankInsight[];
  isLoading?: boolean;
}

const BANK_INFO: Record<string, { name: string; nameAr: string; color: string }> = {
  qnb: { name: "Qatar National Bank", nameAr: "بنك قطر الوطني", color: "text-red-600" },
  hsbc: { name: "HSBC Bank", nameAr: "بنك HSBC", color: "text-blue-600" },
  qib: { name: "Qatar Islamic Bank", nameAr: "بنك قطر الإسلامي", color: "text-green-600" },
  doha: { name: "Doha Bank", nameAr: "بنك الدوحة", color: "text-purple-600" },
};

const INSIGHT_ICONS: Record<string, any> = {
  fee: DollarSign,
  transaction: CreditCard,
  recommendation: Lightbulb,
  pattern: TrendingDown,
};

export function BankInsights({ bankType = "qnb", insights, isLoading }: BankInsightsProps) {
  const { t, dir } = useI18n();
  const isAr = dir === "rtl";
  const { currentTenant } = useTenant();

  const bankInfo = BANK_INFO[bankType.toLowerCase()] || BANK_INFO.qnb;

  // Fetch real data from API
  const { data: apiInsights, isLoading: apiLoading } = useQuery({
    queryKey: ["bank-insights", currentTenant?.id, bankType],
    queryFn: () => getBankInsights(currentTenant?.id || "", bankType),
    enabled: !!currentTenant?.id && !insights,
  });

  const loading = isLoading || apiLoading;

  // Mock insights for QNB
  const mockInsights: BankInsight[] = [
    {
      id: "1",
      type: "fee",
      title: "Average ATM Withdrawal Fee",
      titleAr: "متوسط رسوم السحب من ATM",
      value: "15 QAR",
      valueAr: "15 ريال",
      description: "Per withdrawal",
      descriptionAr: "لكل عملية سحب",
    },
    {
      id: "2",
      type: "transaction",
      title: "International Transfers",
      titleAr: "التحويلات الدولية",
      value: "12 transfers",
      valueAr: "12 تحويل",
      description: "This month",
      descriptionAr: "هذا الشهر",
    },
    {
      id: "3",
      type: "pattern",
      title: "Most Common Transaction Type",
      titleAr: "أكثر نوع معاملة شيوعاً",
      value: "POS Purchases",
      valueAr: "مشتريات POS",
      description: "68% of all transactions",
      descriptionAr: "68% من جميع المعاملات",
    },
    {
      id: "4",
      type: "recommendation",
      title: "Cost Optimization",
      titleAr: "تحسين التكاليف",
      value: "Switch to QNB Digital",
      valueAr: "التحول إلى QNB الرقمي",
      description: "Reduce fees by 40%",
      descriptionAr: "تقليل الرسوم بنسبة 40%",
      impact: "Save ~600 QAR/month",
      impactAr: "توفير ~600 ريال/شهر",
    },
    {
      id: "5",
      type: "fee",
      title: "Monthly Service Charges",
      titleAr: "رسوم الخدمة الشهرية",
      value: "250 QAR",
      valueAr: "250 ريال",
      description: "Account maintenance",
      descriptionAr: "صيانة الحساب",
    },
    {
      id: "6",
      type: "pattern",
      title: "Peak Transaction Day",
      titleAr: "يوم الذروة للمعاملات",
      value: "1st of month",
      valueAr: "أول الشهر",
      description: "Salary day pattern detected",
      descriptionAr: "نمط يوم الراتب مكتشف",
    },
  ];

  const displayInsights = insights || (apiInsights ? apiInsights.map(i => ({
    id: i.id,
    type: i.type,
    title: i.title,
    titleAr: i.title_ar,
    value: i.value,
    valueAr: i.value_ar,
    description: i.description,
    descriptionAr: i.description_ar,
    impact: i.impact,
    impactAr: i.impact_ar,
  })) : []) || mockInsights;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className={cn("h-5 w-5", bankInfo.color)} />
            <CardTitle className="text-base">
              {isAr ? `رؤى ${bankInfo.nameAr}` : `${bankInfo.name} Insights`}
            </CardTitle>
          </div>
          <Badge variant="outline" className={cn("text-xs", bankInfo.color)}>
            {bankType.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayInsights.map((insight) => {
              const Icon = INSIGHT_ICONS[insight.type];
              const isRecommendation = insight.type === "recommendation";

              return (
                <div
                  key={insight.id}
                  className={cn(
                    "border rounded-lg p-4 transition-all hover:shadow-sm",
                    isRecommendation && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex-shrink-0 p-2 rounded-lg",
                      isRecommendation 
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">
                        {isAr ? insight.titleAr : insight.title}
                      </h4>
                      <p className="text-sm font-semibold mb-1">
                        {isAr ? insight.valueAr : insight.value}
                      </p>
                      {insight.description && (
                        <p className="text-xs text-muted-foreground">
                          {isAr ? insight.descriptionAr : insight.description}
                        </p>
                      )}
                      {insight.impact && (
                        <div className="flex items-center gap-1 mt-2">
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <TrendingDown className="h-3 w-3" />
                            {isAr ? insight.impactAr : insight.impact}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {isRecommendation && (
                      <ArrowUpRight className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bank-specific tips */}
        {bankType.toLowerCase() === "qnb" && !loading && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">
                  {isAr ? "💡 نصيحة QNB" : "💡 QNB Tip"}
                </p>
                <p>
                  {isAr
                    ? "استخدم تطبيق QNB Mobile للحصول على رسوم أقل على التحويلات الدولية وإشعارات فورية للمعاملات."
                    : "Use QNB Mobile app for lower fees on international transfers and instant transaction notifications."}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
