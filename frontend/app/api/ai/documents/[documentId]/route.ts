import { NextRequest, NextResponse } from "next/server";

const TENANT_API_URL = process.env.TENANT_API_URL || "http://localhost:8080";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; documentId: string } }
) {
  try {
    const { tenantId, documentId } = params;
    
    const backendUrl = `${TENANT_API_URL}/api/v1/tenants/${tenantId}/documents/${documentId}`;
    
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

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
