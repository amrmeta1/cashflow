"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/shared/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground mb-6">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button asChild>
            <Link href="/liquidity/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
