// Reports API - analysis, transactions, and reporting
import { tenantApi } from './client';

export interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  created_at: string;
  [key: string]: any;
}

import { MOCKS_ENABLED, getMockReports, getMockReport } from "../mocks/mock-data";

export interface ReportSummary {
  id: string;
  title: string;
  period: string;
  status: "ready" | "generating" | "failed";
  created_at: string;
}

export interface ReportDetail {
  id: string;
  title: string;
  period: string;
  status: "ready" | "generating" | "failed";
  created_at: string;
  narrative: string;
  summary: {
    opening_balance: number;
    closing_balance: number;
    total_inflows: number;
    total_outflows: number;
    net_change: number;
  };
  chart_data: { date: string; balance: number }[];
}

export async function listReports(
  tenantId: string
): Promise<{ data: ReportSummary[]; meta: { total: number; limit: number; offset: number } }> {
  if (MOCKS_ENABLED) return getMockReports();
  return tenantApi.get(`/tenants/${tenantId}/reports`);
}

export async function generateReport(
  tenantId: string
): Promise<{ data: ReportSummary }> {
  if (MOCKS_ENABLED) {
    return {
      data: {
        id: "rep-new",
        title: "New Report",
        period: new Date().toISOString().slice(0, 7),
        status: "generating",
        created_at: new Date().toISOString(),
      },
    };
  }
  return tenantApi.post(`/tenants/${tenantId}/reports/generate`);
}

export async function getReport(
  tenantId: string,
  reportId: string
): Promise<{ data: ReportDetail }> {
  if (MOCKS_ENABLED) return getMockReport(reportId);
  return tenantApi.get(`/tenants/${tenantId}/reports/${reportId}`);
}

// Alert functions (consolidated from alerts-api.ts)
export async function getAlert(tenantId: string, alertId: string): Promise<any> {
  return tenantApi.get(`/tenants/${tenantId}/alerts/${alertId}`);
}

export async function acknowledgeAlert(tenantId: string, alertId: string): Promise<void> {
  return tenantApi.post(`/tenants/${tenantId}/alerts/${alertId}/ack`);
}

export async function resolveAlert(tenantId: string, alertId: string): Promise<void> {
  return tenantApi.post(`/tenants/${tenantId}/alerts/${alertId}/resolve`);
}

export async function getActiveAlerts(tenantId: string): Promise<any[]> {
  const response = await tenantApi.get(`/tenants/${tenantId}/alerts/active`) as any;
  return response?.data || [];
}
