"use client";

import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { DocumentsList } from "@/components/documents/DocumentsList";
import { DocumentChat } from "@/components/documents/DocumentChat";
import { Card, CardContent } from "@/components/shared/ui/card";
import { FileText } from "lucide-react";

export default function DocumentsPage() {
  const { dir, locale } = useI18n();
  const { currentTenant } = useTenant();
  const isAr = locale === "ar";

  if (!currentTenant) {
    return (
      <div dir={dir} className="min-h-full w-full" data-page-content>
        <div className="max-w-7xl w-full mx-auto px-6 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {isAr 
                  ? "جاري التحميل..."
                  : "Loading..."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-full w-full" data-page-content>
      <div className="max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">
            {isAr ? "ذكاء المستندات" : "Document Intelligence"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr 
              ? "قم برفع مستندات الخزينة لتشغيل رؤى الذكاء الاصطناعي."
              : "Upload treasury documents to power AI insights."}
          </p>
        </div>

        {/* Upload Component */}
        <DocumentUpload />

        {/* Documents List */}
        <DocumentsList />

        {/* Document Chat */}
        <DocumentChat />
      </div>
    </div>
  );
}
