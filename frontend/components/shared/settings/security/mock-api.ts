import type { SecurityData } from "./types";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export const MOCK_SECURITY: SecurityData = {
  mfa_enabled: false,
  allowed_domains: ["company.com"],
  sessions: [
    {
      id: "s1",
      device: "MacBook Pro",
      browser: "Chrome 121",
      ip: "185.220.x.x",
      location: "Riyadh, SA",
      last_active_at: new Date(Date.now() - 5 * 60_000).toISOString(),
      current: true,
    },
    {
      id: "s2",
      device: "iPhone 15",
      browser: "Safari 17",
      ip: "185.220.x.x",
      location: "Riyadh, SA",
      last_active_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
      current: false,
    },
    {
      id: "s3",
      device: "Windows PC",
      browser: "Edge 121",
      ip: "212.118.x.x",
      location: "Dubai, AE",
      last_active_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      current: false,
    },
  ],
};

export async function fetchSecurity(): Promise<SecurityData> {
  await delay();
  return MOCK_SECURITY;
}

export async function apiRevokeSession(id: string): Promise<{ id: string }> {
  await delay();
  return { id };
}

export async function apiRevokeAllSessions(): Promise<void> {
  await delay(600);
}

export async function apiToggleMfa(enabled: boolean): Promise<{ enabled: boolean }> {
  await delay();
  return { enabled };
}

export async function apiUpdateDomains(
  domains: string[]
): Promise<{ domains: string[] }> {
  await delay();
  return { domains };
}
