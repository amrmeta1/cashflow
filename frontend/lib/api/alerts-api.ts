import { tenantApi } from "./client";
import { MOCKS_ENABLED, getMockAlerts, getMockAlert } from "./mock-data";

export type AlertSeverity = "high" | "medium" | "low";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: AlertStatus;
  created_at: string;
  explanation: string;
  recommended_action: string;
  related_entities: { type: string; id: string }[];
}

export interface AlertsListResponse {
  data: Alert[];
  meta: { total: number; limit: number; offset: number };
}

export interface AlertResponse {
  data: Alert;
}

export async function listAlerts(
  tenantId: string,
  filters?: { severity?: AlertSeverity; status?: AlertStatus }
): Promise<AlertsListResponse> {
  if (MOCKS_ENABLED) {
    const result = getMockAlerts();
    let filtered = result.data;
    if (filters?.severity) filtered = filtered.filter((a) => a.severity === filters.severity);
    if (filters?.status) filtered = filtered.filter((a) => a.status === filters.status);
    return { data: filtered as Alert[], meta: { total: filtered.length, limit: 20, offset: 0 } };
  }
  const params: Record<string, string> = {};
  if (filters?.severity) params.severity = filters.severity;
  if (filters?.status) params.status = filters.status;
  return tenantApi.get(`/tenants/${tenantId}/alerts`, params);
}

export async function getAlert(
  tenantId: string,
  alertId: string
): Promise<AlertResponse> {
  if (MOCKS_ENABLED) {
    const result = getMockAlert(alertId);
    if (!result) throw new Error("Alert not found");
    return result as AlertResponse;
  }
  return tenantApi.get(`/tenants/${tenantId}/alerts/${alertId}`);
}

export async function acknowledgeAlert(
  tenantId: string,
  alertId: string
): Promise<void> {
  if (MOCKS_ENABLED) return;
  return tenantApi.post(`/tenants/${tenantId}/alerts/${alertId}/ack`);
}

export async function resolveAlert(
  tenantId: string,
  alertId: string
): Promise<void> {
  if (MOCKS_ENABLED) return;
  return tenantApi.post(`/tenants/${tenantId}/alerts/${alertId}/resolve`);
}

export async function getActiveAlerts(tenantId: string): Promise<Alert[]> {
  if (MOCKS_ENABLED) {
    const result = getMockAlerts();
    return result.data.filter((a) => a.status === "open") as Alert[];
  }
  
  try {
    const response = await tenantApi.get<{ data: Alert[] }>(`/tenants/${tenantId}/alerts/active`);
    return response.data;
  } catch (error) {
    console.warn("Failed to fetch active alerts from backend, using mock data:", error);
    // Fallback to mock data when backend is unavailable
    const result = getMockAlerts();
    return result.data.filter((a) => a.status === "open") as Alert[];
  }
}
