export interface Insight {
  id: string;
  title: string;
  titleAr: string;
  impact: number;
  confidence: number;
}

export interface InsightsData {
  risks: Insight[];
  opportunities: Insight[];
  recommendations: Insight[];
  lastUpdated: string;
}

export const mockInsights: InsightsData = {
  risks: [
    {
      id: "r1",
      title: "Liquidity risk detected",
      titleAr: "تم اكتشاف مخاطر السيولة",
      impact: 1200000,
      confidence: 82,
    },
    {
      id: "r2",
      title: "Overdue invoice aging",
      titleAr: "تقادم الفواتير المتأخرة",
      impact: 450000,
      confidence: 91,
    },
    {
      id: "r3",
      title: "High burn rate trend",
      titleAr: "اتجاه معدل حرق مرتفع",
      impact: 800000,
      confidence: 76,
    },
    {
      id: "r4",
      title: "Vendor payment concentration",
      titleAr: "تركيز مدفوعات الموردين",
      impact: 350000,
      confidence: 68,
    },
    {
      id: "r5",
      title: "Currency exposure risk",
      titleAr: "مخاطر التعرض للعملة",
      impact: 220000,
      confidence: 73,
    },
  ],
  opportunities: [
    {
      id: "o1",
      title: "Accelerate receivables",
      titleAr: "تسريع المستحقات",
      impact: 450000,
      confidence: 75,
    },
    {
      id: "o2",
      title: "High-yield deposit available",
      titleAr: "وديعة عالية العائد متاحة",
      impact: 300000,
      confidence: 88,
    },
    {
      id: "o3",
      title: "Early payment discount",
      titleAr: "خصم الدفع المبكر",
      impact: 125000,
      confidence: 92,
    },
    {
      id: "o4",
      title: "Optimize cash pooling",
      titleAr: "تحسين تجميع النقد",
      impact: 280000,
      confidence: 79,
    },
    {
      id: "o5",
      title: "Reduce idle cash",
      titleAr: "تقليل النقد الخامل",
      impact: 190000,
      confidence: 71,
    },
  ],
  recommendations: [
    {
      id: "rec1",
      title: "Delay vendor payments by 3 days",
      titleAr: "تأجيل مدفوعات الموردين لمدة 3 أيام",
      impact: 300000,
      confidence: 88,
    },
    {
      id: "rec2",
      title: "Send payment reminders",
      titleAr: "إرسال تذكيرات الدفع",
      impact: 180000,
      confidence: 94,
    },
    {
      id: "rec3",
      title: "Review utility contracts",
      titleAr: "مراجعة عقود المرافق",
      impact: 95000,
      confidence: 82,
    },
    {
      id: "rec4",
      title: "Consolidate bank accounts",
      titleAr: "دمج الحسابات البنكية",
      impact: 150000,
      confidence: 77,
    },
    {
      id: "rec5",
      title: "Schedule VAT filing",
      titleAr: "جدولة تقديم ضريبة القيمة المضافة",
      impact: 0,
      confidence: 96,
    },
  ],
  lastUpdated: new Date().toISOString(),
};
