import { tenantApi } from "./client";
import { MOCKS_ENABLED } from "./mock-data";

export interface DailyBriefItem {
  id: string;
  textAr: string;
  textEn: string;
}

export interface DailyBriefData {
  risks: DailyBriefItem[];
  opportunities: DailyBriefItem[];
  recommendations: DailyBriefItem[];
  confidence: number;
  dataQuality: number;
  lastUpdated: string;
}

export interface DailyBriefResponse {
  data: DailyBriefData;
}

// Mock data for development
const MOCK_BRIEF: DailyBriefData = {
  risks: [
    { 
      id: "r1", 
      textAr: "فاتورة #INV-2847 متأخرة ٧ أيام — ٢٨,٠٠٠ ر.س", 
      textEn: "Invoice #INV-2847 overdue 7 days — 28,000 SAR" 
    },
    { 
      id: "r2", 
      textAr: "مصروف المرافق أعلى ٤٠٪ من المتوسط", 
      textEn: "Utility spend 40% above 3-month average" 
    },
  ],
  opportunities: [
    { 
      id: "o1", 
      textAr: "تحويل ٢٠٠,٠٠٠ ر.س إلى وديعة عالية العائد", 
      textEn: "Move 200,000 to high-yield deposit" 
    },
    { 
      id: "o2", 
      textAr: "إيرادات خدمات متوقعة اليوم ٢٣,٠٠٠ ر.س", 
      textEn: "Expected service revenue today 23,000 SAR" 
    },
  ],
  recommendations: [
    { 
      id: "rec1", 
      textAr: "متابعة الفاتورة المتأخرة وإرسال تذكير واتساب", 
      textEn: "Follow up on overdue invoice and send WhatsApp reminder" 
    },
    { 
      id: "rec2", 
      textAr: "محاكاة تحويل جزء من الرصيد إلى وديعة", 
      textEn: "Simulate moving part of balance to deposit" 
    },
    { 
      id: "rec3", 
      textAr: "إقرار ضريبة القيمة المضافة مستحق خلال ١٢ يوماً", 
      textEn: "VAT filing due in 12 days — documents ready" 
    },
  ],
  confidence: 82,
  dataQuality: 91,
  lastUpdated: new Date().toISOString(),
};

export async function getDailyBrief(tenantId: string): Promise<DailyBriefData> {
  if (MOCKS_ENABLED) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_BRIEF;
  }

  try {
    const response = await tenantApi.get<DailyBriefResponse>(
      `/tenants/${tenantId}/ai/daily-brief`
    );
    return response.data;
  } catch (error) {
    // Fallback to mock data if API fails
    console.warn("Failed to fetch daily brief, using mock data:", error);
    return MOCK_BRIEF;
  }
}
