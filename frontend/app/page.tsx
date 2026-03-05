"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/home");
  }, [router]);
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>
  );
}
