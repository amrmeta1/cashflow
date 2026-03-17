import { NextRequest, NextResponse } from "next/server";

const TENANT_API_URL = process.env.TENANT_API_URL || "http://localhost:8080";

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    
    const backendUrl = `${TENANT_API_URL}/api/v1/tenants/${tenantId}/documents${searchParams ? `?${searchParams}` : ""}`;
    
    const response = await fetch(backendUrl, {
      headers: {
        "X-Tenant-ID": tenantId,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to fetch documents" }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ documents: data.data || [] });
  } catch (error) {
    console.error("Documents API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    const formData = await request.formData();
    
    const backendUrl = `${TENANT_API_URL}/api/v1/tenants/${tenantId}/documents`;
    
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "X-Tenant-ID": tenantId,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Upload failed" }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
