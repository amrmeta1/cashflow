"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useToast } from "@/components/shared/ui/toast";
import { getTreasurySettings, updateTreasurySettings } from "@/lib/api/enterprise-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { Label } from "@/components/shared/ui/label";
import { Button } from "@/components/shared/ui/button";
import { Skeleton } from "@/components/shared/ui/skeleton";

export default function TreasuryControlsPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const queryClient = useQueryClient();
  const { isAdminOrOwner } = usePermissions();
  const { toast } = useToast();
  
  const isAdmin = isAdminOrOwner();

  const { data, isLoading } = useQuery({
    queryKey: ["treasury-settings"],
    queryFn: getTreasurySettings,
  });

  const [formData, setFormData] = useState({
    minimum_cash_floor: 0,
    liquidity_multiplier: 0,
    burn_spike_multiplier: 0,
    revenue_drop_threshold: 0,
    volatility_threshold: 0,
  });

  useEffect(() => {
    if (data?.data) {
      setFormData(data.data);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: updateTreasurySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasury-settings"] });
      toast({
        title: isAr ? "تم الحفظ" : "Saved",
        description: isAr ? "تم تحديث إعدادات الخزينة بنجاح" : "Treasury settings updated successfully",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr ? "فشل تحديث الإعدادات" : "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">
            {isAr ? "ضوابط الخزينة" : "Treasury Controls"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {!isAdmin && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {isAr 
                    ? "يمكن للمسؤولين فقط تعديل ضوابط الخزينة"
                    : "Only administrators can modify treasury controls"
                  }
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {isAr
                    ? "يمكنك عرض الإعدادات الحالية ولكن لا يمكنك إجراء تغييرات"
                    : "You can view current settings but cannot make changes"
                  }
                </p>
              </div>
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {data?.data?.updated_at && (
              <div className="mb-6 pb-4 border-b">
                <p className="text-xs text-muted-foreground">
                  {isAr ? "آخر تحديث: " : "Last updated: "}
                  <span className="font-medium">
                    {new Date(data.data.updated_at).toLocaleString(isAr ? "ar-SA" : "en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  {data.data.updated_by && (
                    <>
                      {isAr ? " بواسطة " : " by "}
                      <span className="font-medium">{data.data.updated_by}</span>
                    </>
                  )}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="minimum_cash_floor">
                {isAr ? "الحد الأدنى للنقد" : "Minimum Cash Floor"}
              </Label>
              <Input
                id="minimum_cash_floor"
                type="number"
                step="0.01"
                value={formData.minimum_cash_floor}
                onChange={(e) => setFormData({ ...formData, minimum_cash_floor: parseFloat(e.target.value) || 0 })}
                disabled={!isAdmin || updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                {isAr 
                  ? "الحد الأدنى للرصيد النقدي المطلوب للحفاظ على السيولة"
                  : "Minimum cash balance required to maintain liquidity"
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="liquidity_multiplier">
                {isAr ? "مضاعف السيولة" : "Liquidity Multiplier"}
              </Label>
              <Input
                id="liquidity_multiplier"
                type="number"
                step="0.01"
                value={formData.liquidity_multiplier}
                onChange={(e) => setFormData({ ...formData, liquidity_multiplier: parseFloat(e.target.value) || 0 })}
                disabled={!isAdmin || updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                {isAr 
                  ? "معامل لحساب احتياطيات السيولة المطلوبة"
                  : "Factor for calculating required liquidity reserves"
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="burn_spike_multiplier">
                {isAr ? "مضاعف ارتفاع الحرق" : "Burn Spike Multiplier"}
              </Label>
              <Input
                id="burn_spike_multiplier"
                type="number"
                step="0.01"
                value={formData.burn_spike_multiplier}
                onChange={(e) => setFormData({ ...formData, burn_spike_multiplier: parseFloat(e.target.value) || 0 })}
                disabled={!isAdmin || updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                {isAr 
                  ? "عتبة الكشف عن الارتفاعات المفاجئة في معدل الحرق"
                  : "Threshold for detecting sudden spikes in burn rate"
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenue_drop_threshold">
                {isAr ? "عتبة انخفاض الإيرادات (%)" : "Revenue Drop Threshold (%)"}
              </Label>
              <Input
                id="revenue_drop_threshold"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.revenue_drop_threshold}
                onChange={(e) => setFormData({ ...formData, revenue_drop_threshold: parseFloat(e.target.value) || 0 })}
                disabled={!isAdmin || updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                {isAr 
                  ? "نسبة الانخفاض في الإيرادات التي تؤدي إلى تنبيه"
                  : "Percentage drop in revenue that triggers an alert"
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volatility_threshold">
                {isAr ? "عتبة التقلب" : "Volatility Threshold"}
              </Label>
              <Input
                id="volatility_threshold"
                type="number"
                step="0.01"
                value={formData.volatility_threshold}
                onChange={(e) => setFormData({ ...formData, volatility_threshold: parseFloat(e.target.value) || 0 })}
                disabled={!isAdmin || updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                {isAr 
                  ? "الحد الأقصى للتقلب المقبول في التدفق النقدي"
                  : "Maximum acceptable volatility in cash flow"
                }
              </p>
            </div>

            {isAdmin && (
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending 
                    ? (isAr ? "جاري الحفظ..." : "Saving...")
                    : (isAr ? "حفظ التغييرات" : "Save Changes")
                  }
                </Button>
              </div>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
