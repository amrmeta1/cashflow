"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { Badge } from "@/components/shared/ui/badge";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/shared/ui/toast";
import { getTenantId, tenantApi } from "@/lib/api/client";
import { FileText, Trash2, Loader2, CheckCircle2, XCircle, File } from "lucide-react";

interface Document {
  document_id: string;
  name: string;
  file_type: string;
  status: string;
  created_at: string;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "ready":
    case "indexed":
      return "default";
    case "processing":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string, isAr: boolean): string {
  switch (status) {
    case "ready":
    case "indexed":
      return isAr ? "مفهرس" : "Indexed";
    case "processing":
      return isAr ? "جاري المعالجة" : "Processing";
    case "failed":
      return isAr ? "فشل" : "Failed";
    default:
      return status;
  }
}

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getStatusIcon(status: string) {
  switch (status) {
    case "ready":
    case "indexed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "processing":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

export function DocumentsList() {
  const { locale, dir } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = getTenantId();
  const isAr = locale === "ar";

  const { data: documentsData, isLoading, isError } = useQuery<{ documents: Document[] }>({
    queryKey: ["documents", tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error("No tenant ID");
      return tenantApi.get(`/api/v1/tenants/${tenantId}/documents`);
    },
    enabled: !!tenantId,
  });

  const documents: Document[] = documentsData?.documents || [];

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!tenantId) throw new Error("No tenant ID");
      return tenantApi.delete(`/api/v1/tenants/${tenantId}/documents/${documentId}`);
    },
    onSuccess: () => {
      toast({
        title: isAr ? "تم حذف المستند" : "Document deleted",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["documents", tenantId] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || (isAr ? "حدث خطأ أثناء الحذف" : "An error occurred during deletion");
      toast({
        title: isAr ? "فشل حذف المستند" : "Failed to delete document",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (documentId: string) => {
    if (confirm(isAr ? "هل أنت متأكد من حذف هذا المستند؟" : "Are you sure you want to delete this document?")) {
      deleteMutation.mutate(documentId);
    }
  };

  return (
    <Card dir={dir}>
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-lg font-semibold">
          {isAr ? "المستندات المفهرسة" : "Indexed Documents"}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {isAr ? "لا توجد مستندات بعد" : "No documents yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAr ? "ابدأ برفع مستند أعلاه" : "Start by uploading a document above"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.document_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      {getStatusIcon(doc.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.created_at, locale)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={getStatusVariant(doc.status)}>
                    {getStatusLabel(doc.status, isAr)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc.document_id)}
                    disabled={deleteMutation.isPending}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
