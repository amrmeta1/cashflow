"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function AIAdvisorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AI Advisor error:", error);
  }, [error]);

  return (
    <div className="min-h-full w-full flex items-center justify-center p-6" data-page-content>
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We encountered an error while loading the AI Advisor page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error.message && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          )}
          <Button onClick={reset} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
