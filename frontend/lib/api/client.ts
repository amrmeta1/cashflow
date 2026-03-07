import { generateRequestId } from "@/lib/utils";
import type { ApiError } from "./types";

let currentTenantId: string | null = null;

export function setTenantId(id: string | null) {
  currentTenantId = id;
}

export function getTenantId(): string | null {
  return currentTenantId;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async headers(): Promise<HeadersInit> {
    const h: HeadersInit = {
      "x-request-id": generateRequestId(),
    };
    if (currentTenantId) {
      h["X-Tenant-ID"] = currentTenantId;
    }
    return h;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString(), {
      headers: await this.headers(),
    });
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiClientError(res.status, err.error);
    }
    return res.json();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const h = await this.headers();
    const isFormData = body instanceof FormData;
    if (!isFormData) {
      (h as Record<string, string>)["Content-Type"] = "application/json";
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: h,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiClientError(res.status, err.error);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const h = await this.headers();
    const isFormData = body instanceof FormData;
    if (!isFormData) {
      (h as Record<string, string>)["Content-Type"] = "application/json";
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: h,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiClientError(res.status, err.error);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: await this.headers(),
    });
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiClientError(res.status, err.error);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }
}

export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiClientError";
  }
}

export const tenantApi = new ApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"
);

export const ingestionApi = new ApiClient(
  process.env.NEXT_PUBLIC_INGESTION_API_BASE_URL || "http://localhost:8081"
);
