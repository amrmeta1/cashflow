export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  actor_sub: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  occurred_at: string;
}

export interface SystemStatus {
  services: Array<{
    name: string;
    status: "operational" | "degraded" | "down";
    response_time_ms: number;
    last_check: string;
  }>;
  uptime_percentage: number;
  uptime_days: number;
  last_backup: {
    timestamp: string;
    status: "success" | "failed" | "in_progress";
    size_mb: number;
  };
}

export interface TreasurySettings {
  minimum_cash_floor: number;
  liquidity_multiplier: number;
  burn_spike_multiplier: number;
  revenue_drop_threshold: number;
  volatility_threshold: number;
  updated_at?: string;
  updated_by?: string;
}
