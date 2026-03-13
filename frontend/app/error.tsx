"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/shared/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  );
}
