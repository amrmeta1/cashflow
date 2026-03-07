import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // TODO: Replace with actual AI/LLM integration
    // For now, return a mock response
    const mockResponse = generateMockResponse(question);

    return NextResponse.json({
      answer: mockResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateMockResponse(question: string): string {
  const lowerQuestion = question.toLowerCase();

  // Simple keyword-based mock responses
  if (lowerQuestion.includes("burn rate") || lowerQuestion.includes("معدل الحرق")) {
    return "معدل الحرق الشهري الحالي هو 85,000 ر.س. ارتفع بنسبة 12% هذا الشهر بسبب زيادة في مصاريف التسويق (25,000 ر.س) ومصاريف التوظيف الجديدة (15,000 ر.س). نوصي بمراجعة عقود التسويق وتأجيل التوظيف غير الضروري.";
  }

  if (lowerQuestion.includes("cash flow") || lowerQuestion.includes("التدفق النقدي")) {
    return "التدفق النقدي الحالي إيجابي بـ 45,000 ر.س شهرياً. المتحصلات الشهرية: 180,000 ر.س، المصروفات: 135,000 ر.س. التوقعات للأشهر الثلاثة القادمة مستقرة مع احتمال تحسن 15% بسبب عقود جديدة.";
  }

  if (lowerQuestion.includes("invoice") || lowerQuestion.includes("فاتورة")) {
    return "لديك 3 فواتير متأخرة بقيمة إجمالية 78,000 ر.س. الفاتورة #INV-2847 (28,000 ر.س) متأخرة 7 أيام. نوصي بإرسال تذكير فوري والتواصل مع العميل.";
  }

  if (lowerQuestion.includes("forecast") || lowerQuestion.includes("توقعات")) {
    return "التوقعات للأسابيع الـ13 القادمة تشير إلى رصيد نقدي نهائي قدره 320,000 ر.س (من 250,000 ر.س حالياً). مستوى الثقة: 82%. العوامل الرئيسية: استمرار العقود الحالية وتحصيل الفواتير المتأخرة.";
  }

  if (lowerQuestion.includes("risk") || lowerQuestion.includes("مخاطر")) {
    return "المخاطر الحالية: 1) فواتير متأخرة (78,000 ر.س)، 2) ارتفاع معدل الحرق 12%، 3) احتياطي نقدي أقل من 3 أشهر. نوصي بتسريع التحصيل وتقليل المصاريف غير الضرورية.";
  }

  // Default response
  return `شكراً على سؤالك. بناءً على البيانات المتاحة، يمكنني مساعدتك في تحليل التدفق النقدي، معدل الحرق، الفواتير المتأخرة، والتوقعات المالية. هل يمكنك توضيح سؤالك أكثر؟`;
}
