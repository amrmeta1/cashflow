"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/shared/ui/toast";
// TODO: Restore when report components are available
// import { useGenerateReport } from "@/components/reports/reports/hooks";
// import { GenerateDialog } from "@/components/reports/reports/generate-dialog";
// import type { GenerateFormValues } from "@/components/reports/reports/types";

type GenerateFormValues = any;
const useGenerateReport = (tenantId: any) => ({ 
  mutate: (values: any, options?: any) => {
    // Mock implementation
    if (options?.onSuccess) options.onSuccess();
  }, 
  isPending: false 
});
const GenerateDialog = ({ open, onOpenChange, onSubmit, isPending }: any) => null;

export function GlobalReportDialog() {
  const { currentTenant } = useTenant();
  const { locale } = useI18n();
  const { toast } = useToast();
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);

  const tenantId = currentTenant?.id;
  const generateMutation = useGenerateReport(tenantId);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-generate-report-dialog", handler);
    return () => window.removeEventListener("open-generate-report-dialog", handler);
  }, []);

  const handleSubmit = (values: GenerateFormValues) => {
    generateMutation.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        toast({
          title: isAr ? "تم بدء إنشاء التقرير" : "Report generation started",
          variant: "success",
        });
      },
      onError: () => {
        toast({
          title: isAr ? "فشل إنشاء التقرير" : "Failed to generate report",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <GenerateDialog
      open={open}
      onOpenChange={setOpen}
      onSubmit={handleSubmit}
      isPending={generateMutation.isPending}
      isAr={isAr}
    />
  );
}
