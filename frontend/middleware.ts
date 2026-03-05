/**
 * Multi-tenant middleware: detect tenant from subdomain, custom domain, or JWT.
 * Uses constants from lib/tenant-constants (no next/headers here — Edge-safe).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { TENANT_HEADER, TENANT_COOKIE } from "@/lib/tenant-constants";

/** Base host (no subdomain) for tenant subdomain resolution, e.g. tadfuq.ai */
const BASE_HOST = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "tadfuq.ai";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 1) Prefer tenant id from cookie (set by client when user switches tenant)
  let tenantId: string | null = request.cookies.get(TENANT_COOKIE)?.value ?? null;

  // 2) If no cookie, try subdomain: client.tadfuq.ai or client.localhost -> slug "client"
  // Resolve slug -> tenant_id would require edge fetch to your API; for now we fall back to JWT/demo.
  const _slugFromHost = getTenantSlugFromHost(request.headers.get("host") ?? "");

  // 3) Fall back to JWT (Keycloak session tenant_id)
  if (!tenantId) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });
    tenantId = token?.tenantId ?? null;
  }

  if (!tenantId && process.env.NODE_ENV !== "production") {
    tenantId = "demo";
  }

  if (tenantId) {
    response.headers.set(TENANT_HEADER, tenantId);
    // Keep cookie in sync so server components can read it
    response.cookies.set(TENANT_COOKIE, tenantId, { path: "/", httpOnly: true, sameSite: "lax" });
  }

  return response;
}

/**
 * Extract tenant slug from host if subdomain pattern: slug.basehost or slug.localhost
 */
function getTenantSlugFromHost(host: string): string | null {
  const lower = host.toLowerCase();
  if (lower.startsWith("www.") || lower === "localhost" || lower === "127.0.0.1") return null;
  if (lower.endsWith(".localhost") || lower.endsWith(".127.0.0.1")) {
    const part = lower.split(".")[0];
    return part && part !== "www" ? part : null;
  }
  if (BASE_HOST && lower.endsWith(`.${BASE_HOST}`)) {
    const part = lower.slice(0, -(BASE_HOST.length + 1));
    return part && part !== "www" ? part : null;
  }
  return null;
}

export const config = {
  matcher: [
    /*
     * Match all app paths (and API if you want tenant on API routes).
     * Exclude static files and _next.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
