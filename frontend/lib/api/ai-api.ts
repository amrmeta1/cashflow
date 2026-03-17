// Consolidated AI API - agents, insights, and RAG
import { tenantApi } from './client';

// Agent APIs
export interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
}

export async function getAgents(tenantId: string): Promise<Agent[]> {
  return tenantApi.get(`/tenants/${tenantId}/ai/agents`);
}

export async function getAgent(tenantId: string, agentId: string): Promise<Agent> {
  return tenantApi.get(`/tenants/${tenantId}/ai/agents/${agentId}`);
}

export async function executeAgent(tenantId: string, agentId: string, input: any): Promise<any> {
  return tenantApi.post(`/tenants/${tenantId}/ai/agents/${agentId}/execute`, input);
}

// Insights APIs
export interface Insight {
  id: string;
  type: string;
  title: string;
  titleAr?: string;
  description: string;
  confidence: number;
  impact?: number;
  created_at: string;
}

export async function getInsights(tenantId: string): Promise<Insight[]> {
  return tenantApi.get(`/tenants/${tenantId}/ai/insights`);
}

// RAG/Document APIs
export async function queryDocuments(tenantId: string, query: string): Promise<any> {
  return tenantApi.post(`/tenants/${tenantId}/ai/query`, { query });
}
