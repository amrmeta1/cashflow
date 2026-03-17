// Signals API - AI Agent Phase A signal detection
import { tenantApi } from './client';

export interface Signal {
  id: string;
  tenant_id: string;
  signal_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  data: Record<string, any>;
  status: "active" | "resolved" | "dismissed";
  created_at: string;
  updated_at: string;
}

export interface SignalResult {
  tenant_id: string;
  generated_at?: string;
  signals: Signal[];
  alerts: Signal[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Get stored signals for a tenant
 * @param tenantId - Tenant UUID
 * @param status - Filter by status (default: "active")
 */
export async function getSignals(
  tenantId: string,
  status: string = "active"
): Promise<SignalResult> {
  return tenantApi.get(`/api/v1/tenants/${tenantId}/signals?status=${status}`);
}

/**
 * Trigger signal detection engine
 * @param tenantId - Tenant UUID
 */
export async function runSignalEngine(tenantId: string): Promise<SignalResult> {
  return tenantApi.post(`/api/v1/tenants/${tenantId}/signals/run`);
}
