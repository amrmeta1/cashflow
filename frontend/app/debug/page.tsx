"use client";

import { useSession } from "@/lib/auth/session";

export default function DebugPage() {
  const session = useSession();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Info</h1>
      <div className="space-y-2">
        <p><strong>DEV_SKIP_AUTH:</strong> {process.env.NEXT_PUBLIC_DEV_SKIP_AUTH}</p>
        <p><strong>Session Status:</strong> {session.status}</p>
        <p><strong>Session Data:</strong> {JSON.stringify(session.data)}</p>
      </div>
    </div>
  );
}
