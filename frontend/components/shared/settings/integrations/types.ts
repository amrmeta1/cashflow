export type IntegrationStatus = "connected" | "disconnected" | "coming_soon" | "error";
export type IntegrationCategory = "import" | "bank" | "accounting";

export interface Integration {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  logo: string;
  last_sync_at?: string;
  enabled: boolean;
}
