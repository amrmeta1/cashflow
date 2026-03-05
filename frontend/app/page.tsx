"use client";

import { useEffect } from "react";

export default function RootPage() {
  useEffect(() => {
    // Force immediate redirect to /app/dashboard
    if (typeof window !== 'undefined') {
      window.location.replace("/app/dashboard");
    }
  }, []);
  
  return null;
}
