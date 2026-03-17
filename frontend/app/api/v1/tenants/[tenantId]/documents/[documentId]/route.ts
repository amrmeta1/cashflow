import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; documentId: string } }
) {
  try {
    const { tenantId, documentId } = params;
    
    const backendUrl = `${BACKEND_URL}/api/v1/tenants/${tenantId}/documents/${documentId}`;
    
    const response = await fetch(backendUrl, {
      method: "DELETE",
      headers: {
        "X-Tenant-ID": tenantId,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Delete failed" }));
      return NextResponse.json(error, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
