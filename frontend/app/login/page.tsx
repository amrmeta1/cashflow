"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/app/dashboard");
    }
  }, [status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            CF
          </div>
          <CardTitle className="text-2xl">CashFlow.ai</CardTitle>
          <CardDescription>
            Agentic financial management for GCC SMEs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => signIn("keycloak", { callbackUrl: "/app/dashboard" })}
          >
            Sign in with Keycloak
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Your data is secured with enterprise-grade encryption
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
