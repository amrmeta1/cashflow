"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";

export default function TransactionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, dir } = useI18n();
  const router = useRouter();
  const isAr = locale === "ar";

  useEffect(() => {
    console.error("Transactions error:", error);
  }, [error]);

  return (
    <div dir={dir} className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md border-rose-200 dark:border-rose-900">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-3">
            <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <CardTitle className="text-lg">
            {isAr ? "حدث خطأ في المعاملات" : "Transactions Error"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {isAr
              ? "عذراً، حدث خطأ أثناء تحميل المعاملات. يرجى المحاولة مرة أخرى."
              : "Sorry, an error occurred while loading transactions. Please try again."}
          </p>
          
          {error.message && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={reset} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              {isAr ? "إعادة المحاولة" : "Try Again"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/app/dashboard")}
              className="w-full gap-2"
            >
              <Home className="h-4 w-4" />
              {isAr ? "العودة للوحة التحكم" : "Back to Dashboard"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
