export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  last_active_at: string;
  current: boolean;
}

export interface SecurityData {
  mfa_enabled: boolean;
  allowed_domains: string[];
  sessions: ActiveSession[];
}
