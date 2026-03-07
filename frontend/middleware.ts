/**
 * Multi-tenant middleware: detect tenant from subdomain, custom domain, or cookie.
 * Uses constants from lib/tenant-constants (no next/headers here — Edge-safe).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TENANT_HEADER, TENANT_COOKIE } from "@/lib/tenant-constants";

/** Base host (no subdomain) for tenant subdomain resolution, e.g. TadFuq.ai */
const BASE_HOST = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "TadFuq.ai";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root to /home
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // 1) Prefer tenant id from cookie (set by client when user switches tenant)
  let tenantId: string | null = request.cookies.get(TENANT_COOKIE)?.value ?? null;

  // 2) If no cookie, try subdomain: client.TadFuq.ai or client.localhost -> slug "client"
  const _slugFromHost = getTenantSlugFromHost(request.headers.get("host") ?? "");

  // 3) Default to demo tenant
  if (!tenantId) {
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
     * Match all app paths.
     * Exclude static files and _next.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
