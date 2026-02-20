"use client";

import { useCallback, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ImportStage = "idle" | "uploading" | "analyzing" | "review";

export interface ImportRow {
  id: string;
  date: string;
  rawText: string;
  amount: number;
  currency: string;
  aiCategory: string;
  aiVendor: string;
  aiConfidence: number;
}

// ── GCC Mock Data ─────────────────────────────────────────────────────────────
// Realistic messy bank strings common in Saudi Arabia / GCC

export const GCC_MOCK_ROWS: ImportRow[] = [
  {
    id: "r1",
    date: "2026-01-08",
    rawText: "POS PUR 0987 STC PAY RIYADH SA 966",
    amount: -1_250,
    currency: "SAR",
    aiCategory: "Software",
    aiVendor: "STC",
    aiConfidence: 97,
  },
  {
    id: "r2",
    date: "2026-01-10",
    rawText: "TRF FROM 993848 OOREDOO QAT DOHA",
    amount: 48_200,
    currency: "SAR",
    aiCategory: "Revenue",
    aiVendor: "Ooredoo",
    aiConfidence: 91,
  },
  {
    id: "r3",
    date: "2026-01-12",
    rawText: "SADAD BILL 001 KAHRAMAA 00291847",
    amount: -3_740,
    currency: "SAR",
    aiCategory: "Utilities",
    aiVendor: "Kahramaa",
    aiConfidence: 99,
  },
  {
    id: "r4",
    date: "2026-01-15",
    rawText: "SALARY WIF 09/2026 TRANSFER BATCH",
    amount: -45_000,
    currency: "SAR",
    aiCategory: "Payroll",
    aiVendor: "Payroll Q1",
    aiConfidence: 98,
  },
  {
    id: "r5",
    date: "2026-01-18",
    rawText: "ZATCA VAT PAYMENT REF 20260118KSA",
    amount: -18_500,
    currency: "SAR",
    aiCategory: "Tax",
    aiVendor: "ZATCA",
    aiConfidence: 99,
  },
  {
    id: "r6",
    date: "2026-01-21",
    rawText: "CR NEOM DEV PROJ MILE 3 INV089 SA",
    amount: 180_000,
    currency: "SAR",
    aiCategory: "Revenue",
    aiVendor: "NEOM Development",
    aiConfidence: 88,
  },
];

// ── Terminal feed strings ─────────────────────────────────────────────────────

const TERMINAL_LINES = [
  "Mustashar AI is scanning 142 rows...",
  "Cleaning messy merchant names...",
  "Mapping 'POS PUR STC' → 'IT & Software'...",
  "Mapping 'SADAD BILL KAHRAMAA' → 'Utilities'...",
  "Detecting ZATCA VAT payment pattern...",
  "Calculating confidence scores...",
  "Deduplicating against existing ledger...",
  "Auto-categorization complete. 98.6% accuracy.",
];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCSVImport() {
  const [stage, setStage]             = useState<ImportStage>("idle");
  const [progress, setProgress]       = useState(0);
  const [terminalLine, setTerminal]   = useState("");
  const [fileName, setFileName]       = useState("");
  const [rows, setRows]               = useState<ImportRow[]>([]);

  const terminalIdx = useRef(0);
  const uploadTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (uploadTimer.current)  clearInterval(uploadTimer.current);
    if (analyzeTimer.current) clearInterval(analyzeTimer.current);
  };

  // ── Phase 2: Uploading (0→100% in ~1.5s) ──────────────────────────────────
  const startUpload = useCallback((file: File) => {
    setFileName(file.name);
    setStage("uploading");
    setProgress(0);

    uploadTimer.current = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 14 + 8;
        if (next >= 100) {
          clearInterval(uploadTimer.current!);
          startAnalyzing();
          return 100;
        }
        return next;
      });
    }, 100);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 3: Analyzing (terminal feed for ~3s) ────────────────────────────
  const startAnalyzing = useCallback(() => {
    setStage("analyzing");
    setProgress(0);
    terminalIdx.current = 0;
    setTerminal(TERMINAL_LINES[0]);

    // Cycle terminal strings every 600ms
    analyzeTimer.current = setInterval(() => {
      terminalIdx.current += 1;
      if (terminalIdx.current < TERMINAL_LINES.length) {
        setTerminal(TERMINAL_LINES[terminalIdx.current]);
      }
    }, 600);

    // Fake progress during analysis
    const analysisProgress = setInterval(() => {
      setProgress((p) => Math.min(p + 3, 95));
    }, 90);

    // After 3s → review
    setTimeout(() => {
      clearInterval(analyzeTimer.current!);
      clearInterval(analysisProgress);
      setProgress(100);
      setRows(GCC_MOCK_ROWS);
      setStage("review");
    }, 3_000);
  }, []);

  // ── onDrop handler ────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) startUpload(accepted[0]);
  }, [startUpload]);

  // ── Confirm & Import ──────────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    // Caller handles toast + redirect
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    clearTimers();
    setStage("idle");
    setProgress(0);
    setTerminal("");
    setFileName("");
    setRows([]);
    terminalIdx.current = 0;
  }, []);

  return {
    stage,
    progress,
    terminalLine,
    fileName,
    rows,
    onDrop,
    handleConfirm,
    handleReset,
  };
}
