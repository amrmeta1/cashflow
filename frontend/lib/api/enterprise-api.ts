// Enterprise API - tenant management and enterprise features
import { tenantApi } from './client';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  email: string;
  name: string;
  status: string;
}

// Tenant APIs
export async function getTenant(tenantId: string): Promise<Tenant> {
  return tenantApi.get(`/tenants/${tenantId}`);
}

export async function updateTenant(tenantId: string, data: Partial<Tenant>): Promise<Tenant> {
  return tenantApi.patch(`/tenants/${tenantId}`, data);
}

export async function getMembers(tenantId: string): Promise<Member[]> {
  return tenantApi.get(`/tenants/${tenantId}/members`);
}

export async function listMembers(tenantId: string, limit = 20, offset = 0): Promise<any> {
  return tenantApi.get(`/tenants/${tenantId}/members`, {
    limit: String(limit),
    offset: String(offset),
  });
}

export async function inviteMember(tenantId: string, email: string, role: string): Promise<Member> {
  return tenantApi.post(`/tenants/${tenantId}/members/invite`, { email, role });
}

export async function addMember(tenantId: string, input: any): Promise<Member> {
  return tenantApi.post(`/tenants/${tenantId}/members`, input);
}

export async function removeMember(tenantId: string, memberId: string): Promise<void> {
  await tenantApi.delete(`/tenants/${tenantId}/members/${memberId}`);
}

export async function updateMemberRole(
  tenantId: string,
  memberId: string,
  role: string
): Promise<Member> {
  return tenantApi.patch(`/tenants/${tenantId}/members/${memberId}`, { role });
}

export async function createTenant(data: { name: string; slug: string }): Promise<Tenant> {
  return tenantApi.post('/tenants', data);
}

export async function listAuditLogs(limit = 20, offset = 0): Promise<any> {
  return tenantApi.get("/audit-logs", {
    limit: String(limit),
    offset: String(offset),
  });
}

export async function getSystemStatus(): Promise<any> {
  return tenantApi.get("/system/status");
}

export async function getTreasurySettings(): Promise<any> {
  return tenantApi.get("/settings/treasury");
}

export async function updateTreasurySettings(input: any): Promise<any> {
  return tenantApi.put("/settings/treasury", input);
}
