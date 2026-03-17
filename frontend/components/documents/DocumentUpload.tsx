"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/shared/ui/toast";
import { getTenantId, tenantApi } from "@/lib/api/client";
import { UploadCloud, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

function getFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "xlsx" || ext === "xls") return "excel";
  if (ext === "csv") return "csv";
  if (ext === "txt") return "txt";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) return "image";
  return "unknown";
}

export function DocumentUpload() {
  const { locale, dir } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = getTenantId();
  const isAr = locale === "ar";
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!tenantId) throw new Error("No tenant ID");
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "report");

      return tenantApi.post(`/api/v1/tenants/${tenantId}/documents`, formData);
    },
    onSuccess: () => {
      toast({
        title: isAr ? "تم رفع المستند بنجاح" : "Document uploaded successfully",
        description: isAr ? "بدأت الفهرسة." : "Indexing started.",
        variant: "success",
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["documents", tenantId] });
    },
    onError: (error: any) => {
      let errorMessage = error?.message || (isAr ? "حدث خطأ غير متوقع" : "An unexpected error occurred");
      
      // Provide helpful message for parsing errors
      if (errorMessage.includes("no text content") || errorMessage.includes("parsing")) {
        errorMessage = isAr 
          ? "الملف لا يحتوي على نص قابل للاستخراج. جرب ملف نصي (TXT) أو ملف يحتوي على نص."
          : "Document contains no extractable text. Try a text file (TXT) or a document with text content.";
      }
      
      toast({
        title: isAr ? "فشل رفع المستند" : "Failed to upload document",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const fileType = getFileType(file.name);
      
      if (fileType === "unknown") {
        toast({
          title: isAr ? "نوع ملف غير مدعوم" : "Unsupported file type",
          description: isAr ? "يرجى رفع PDF, DOCX, Excel, CSV, أو صور" : "Please upload PDF, DOCX, Excel, CSV, or images",
          variant: "destructive",
        });
        return;
      }

      // Check file size (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: isAr ? "الملف كبير جداً" : "File too large",
          description: isAr 
            ? `الحد الأقصى للحجم هو 10 ميجابايت. حجم الملف: ${(file.size / 1024 / 1024).toFixed(2)} ميجابايت`
            : `Maximum size is 10MB. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      uploadMutation.mutate(file);
    }
  }, [toast, isAr, uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    maxFiles: 1,
    disabled: uploadMutation.isPending,
  });

  return (
    <Card dir={dir}>
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-lg font-semibold">
          {isAr ? "رفع مستند" : "Upload Document"}
        </CardTitle>
        <CardDescription>
          {isAr ? "PDF, Word, Excel, CSV, أو صور" : "PDF, Word, Excel, CSV, or images"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer",
            isDragActive && "border-primary bg-primary/5",
            !isDragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
            uploadMutation.isPending && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3 text-center">
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {isAr ? "جاري الرفع..." : "Uploading..."}
                </p>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{selectedFile.name}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {isDragActive
                      ? isAr ? "أفلت الملف هنا" : "Drop file here"
                      : isAr 
                        ? "اسحب وأفلت المستندات المالية أو مستندات الخزينة هنا"
                        : "Drag & drop financial or treasury documents here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isAr ? "أو" : "or"}
                  </p>
                </div>
                <Button variant="outline" type="button">
                  {isAr ? "اختر ملف" : "Choose File"}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
