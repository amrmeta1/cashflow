"use client";

// ── Types ────────────────────────────────────────────────────────────────────

interface CashMovement {
  date: string;
  description: string;
  description_ar: string;
  category: string;
  category_ar: string;
  amount: number;
}

interface A4ReportDocumentProps {
  companyName: string;
  period: string;
  isAr?: boolean;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const CASH_MOVEMENTS: CashMovement[] = [
  {
    date: "2026-01-08",
    description: "NEOM Development — Project Milestone 3",
    description_ar: "شركة نيوم للتطوير — المرحلة الثالثة",
    category: "Revenue",
    category_ar: "إيرادات",
    amount: 180_000,
  },
  {
    date: "2026-01-15",
    description: "Payroll — January 2026 (WPS)",
    description_ar: "الرواتب — يناير ٢٠٢٦ (نظام حماية الأجور)",
    category: "Payroll",
    category_ar: "رواتب",
    amount: -45_000,
  },
  {
    date: "2026-01-18",
    description: "ZATCA VAT Payment — Q4 2025",
    description_ar: "سداد ضريبة القيمة المضافة — الربع الرابع ٢٠٢٥",
    category: "Tax",
    category_ar: "ضرائب",
    amount: -18_500,
  },
  {
    date: "2026-01-21",
    description: "Gulf Ventures Co. — Invoice INV-2026-041",
    description_ar: "شركة الخليج للمشاريع — فاتورة INV-2026-041",
    category: "Revenue",
    category_ar: "إيرادات",
    amount: 48_200,
  },
  {
    date: "2026-01-28",
    description: "Office Lease — Al Olaya Tower Q1",
    description_ar: "إيجار المكتب — برج العليا الربع الأول",
    category: "Rent",
    category_ar: "إيجار",
    amount: -12_000,
  },
];

const AI_SUMMARY_EN =
  "In Q1 2026, operating cash flow remained resilient with a net positive position of SAR 16,350. However, AI analysis indicates a 14% increase in days sales outstanding (DSO) driven by delayed collections from two key clients. The VAT liability of SAR 18,500 has been successfully ring-fenced and submitted to ZATCA on schedule. Mustashar AI recommends placing SAR 50,000 in idle cash into short-term Murabaha deposits to optimize yield while maintaining liquidity. Collection velocity should be accelerated in Q2 to sustain the positive cash trajectory.";

const AI_SUMMARY_AR =
  "في الربع الأول من عام ٢٠٢٦، حافظ التدفق النقدي التشغيلي على مرونته مع صافي موقف إيجابي بلغ ١٦٬٣٥٠ ريالًا. غير أن تحليل الذكاء الاصطناعي يُشير إلى ارتفاع بنسبة ١٤٪ في متوسط أيام التحصيل بسبب تأخر التحصيل من عميلين رئيسيين. تم تجميد التزام ضريبة القيمة المضافة البالغ ١٨٬٥٠٠ ريال بنجاح وتسديده لهيئة الزكاة والضريبة والجمارك في الموعد المحدد. يوصي مستشار AI بإيداع ٥٠٬٠٠٠ ريال من السيولة الخاملة في ودائع المرابحة قصيرة الأجل لتحسين العائد مع الحفاظ على السيولة.";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmount(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US");
  return n < 0 ? `(SAR ${abs})` : `SAR ${abs}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function A4ReportDocument({
  companyName,
  period,
  isAr = false,
}: A4ReportDocumentProps) {
  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    /*
     * A4 paper container
     * Screen: floating white card with shadow, fixed 210mm width
     * Print:  full-width, no shadow, no ring, no padding override
     */
    <div
      className={[
        "w-full max-w-[210mm] min-h-[297mm] mx-auto",
        "bg-white text-zinc-900",
        "shadow-2xl ring-1 ring-zinc-200",
        "p-[20mm]",
        /* print overrides */
        "print:shadow-none print:ring-0 print:border-none",
        "print:max-w-none print:w-full",
        "print:p-[15mm] print:m-0",
        "print:bg-white",
      ].join(" ")}
    >

      {/* ── 1. Document Header ── */}
      <div className="flex items-start justify-between border-b-4 border-zinc-900 pb-4 mb-8">
        <div>
          <p className="text-2xl font-serif font-bold text-zinc-900 leading-tight">
            {companyName}
          </p>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-mono">
            {isAr ? "تقرير مالي لمجلس الإدارة" : "Board Financial Report"}
          </p>
        </div>
        <div className="text-end">
          <p className="text-sm font-semibold text-zinc-900">{period}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{generatedDate}</p>
        </div>
      </div>

      {/* ── 2. AI Executive Summary ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
          {isAr ? "الملخص التنفيذي — مستشار AI" : "AI Executive Summary"}
        </p>
        <div className="bg-zinc-50 print:bg-transparent border-s-4 border-zinc-900 p-5 text-sm leading-relaxed font-serif text-zinc-900">
          {isAr ? AI_SUMMARY_AR : AI_SUMMARY_EN}
        </div>
      </div>

      {/* ── 3. Core Financials ── */}
      <div className="grid grid-cols-3 gap-6 my-10">
        {[
          {
            label_en: "Cash on Hand",
            label_ar: "النقد المتاح",
            value: "SAR 152,340",
            sub_en: "Closing balance",
            sub_ar: "الرصيد الختامي",
          },
          {
            label_en: "Monthly Burn Rate",
            label_ar: "معدل الإنفاق الشهري",
            value: "SAR 31,850",
            sub_en: "Total outflows",
            sub_ar: "إجمالي المدفوعات",
          },
          {
            label_en: "Projected Runway",
            label_ar: "المدة التشغيلية المتوقعة",
            value: "14 Months",
            sub_en: "At current burn rate",
            sub_ar: "بمعدل الإنفاق الحالي",
          },
        ].map((m) => (
          <div key={m.label_en} className="border-t-2 border-zinc-900 pt-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              {isAr ? m.label_ar : m.label_en}
            </p>
            <p className="text-3xl font-bold text-zinc-900 tabular-nums tracking-tighter leading-none">
              {m.value}
            </p>
            <p className="text-xs text-zinc-400 mt-1.5">
              {isAr ? m.sub_ar : m.sub_en}
            </p>
          </div>
        ))}
      </div>

      {/* ── 4. Cash Movements Table ── */}
      <div className="mt-12">
        <p className="text-sm font-bold border-b border-zinc-200 pb-2 mb-4 text-zinc-900 uppercase tracking-wide">
          {isAr ? "أبرز الحركات النقدية" : "Significant Cash Movements"}
        </p>
        <table className="w-full text-sm text-start">
          <thead>
            <tr>
              {(isAr
                ? ["التاريخ", "الوصف", "الفئة", "المبلغ"]
                : ["Date", "Description", "Category", "Amount"]
              ).map((h, i) => (
                <th
                  key={h}
                  className={[
                    "border-b-2 border-zinc-900 py-2 text-xs font-bold text-zinc-900 uppercase tracking-wide",
                    i === 3 ? "text-end" : "text-start",
                  ].join(" ")}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CASH_MOVEMENTS.map((row, i) => (
              <tr key={i}>
                <td className="border-b border-zinc-200 py-3 text-zinc-500 font-mono text-xs whitespace-nowrap pe-4">
                  {row.date}
                </td>
                <td className="border-b border-zinc-200 py-3 text-zinc-800 pe-4">
                  {isAr ? row.description_ar : row.description}
                </td>
                <td className="border-b border-zinc-200 py-3 text-zinc-500 text-xs pe-4 whitespace-nowrap">
                  {isAr ? row.category_ar : row.category}
                </td>
                <td
                  className={[
                    "border-b border-zinc-200 py-3 text-end font-mono tabular-nums font-medium whitespace-nowrap",
                    row.amount < 0 ? "text-red-700" : "text-zinc-900",
                  ].join(" ")}
                >
                  {fmtAmount(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 5. Document Footer ── */}
      <div className="mt-32 pt-8 border-t border-zinc-200 flex justify-between text-[10px] text-zinc-500 font-mono">
        <span>
          {isAr ? "سري — مجلس الإدارة" : "Confidential — Board of Directors"}
        </span>
        <span>
          {isAr
            ? "صدر بأمان عبر CashFlow.ai Mustashar"
            : "Generated securely by CashFlow.ai Mustashar"}
        </span>
      </div>

    </div>
  );
}
