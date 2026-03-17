// ── Reconciliation shared types & mock data ───────────────────────────────────

export interface BankTransaction {
  id: string;
  date: string;
  dateAr: string;
  desc: string;
  amount: number;
  type: "credit" | "debit";
}

export interface LedgerInvoice {
  id: string;
  client: string;
  clientAr: string;
  amount: number;
  dueDate: string;
  dueDateAr: string;
  type: "receivable" | "payable";
}

export type MatchStatus = "pending" | "approved" | "rejected";

export interface MatchPair {
  id: string;
  bankTxn: BankTransaction;
  invoice: LedgerInvoice | null;
  confidence: number;
  reason: string;
  reasonAr: string;
  status: MatchStatus;
  isFee?: boolean;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MATCH_PAIRS: MatchPair[] = [
  {
    id: "m1",
    bankTxn: {
      id: "b1",
      date: "20 Feb 2026",
      dateAr: "٢٠ فبراير ٢٠٢٦",
      desc: "TRF-INWARD-SABIC-992",
      amount: 150_000,
      type: "credit",
    },
    invoice: {
      id: "INV-2026-041",
      client: "SABIC Corp",
      clientAr: "شركة سابك",
      amount: 150_000,
      dueDate: "18 Feb 2026",
      dueDateAr: "١٨ فبراير ٢٠٢٦",
      type: "receivable",
    },
    confidence: 99,
    reason: "Exact amount & name match",
    reasonAr: "تطابق تام في المبلغ والاسم",
    status: "pending",
  },
  {
    id: "m2",
    bankTxn: {
      id: "b2",
      date: "19 Feb 2026",
      dateAr: "١٩ فبراير ٢٠٢٦",
      desc: "POS-SETTLEMENT-STC-PAY",
      amount: 12_450,
      type: "credit",
    },
    invoice: {
      id: "MULTIPLE (3 Invoices)",
      client: "Retail Walk-ins",
      clientAr: "عملاء التجزئة",
      amount: 12_450,
      dueDate: "19 Feb 2026",
      dueDateAr: "١٩ فبراير ٢٠٢٦",
      type: "receivable",
    },
    confidence: 85,
    reason: "Sum of 3 invoices matches total",
    reasonAr: "مجموع ٣ فواتير يساوي الإجمالي",
    status: "pending",
  },
  {
    id: "m3",
    bankTxn: {
      id: "b3",
      date: "18 Feb 2026",
      dateAr: "١٨ فبراير ٢٠٢٦",
      desc: "WIRE-FEES-INTER",
      amount: -150,
      type: "debit",
    },
    invoice: null,
    confidence: 95,
    reason: "Identified as standard bank fee. Auto-categorize to 'Bank Charges'?",
    reasonAr: "رسوم بنكية اعتيادية. تصنيف تلقائي إلى 'مصاريف بنكية'؟",
    status: "pending",
    isFee: true,
  },
];
