"use client";

import { useCallback, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ImportStage = "idle" | "file_selected" | "uploading" | "analyzing" | "review";

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
  "Scanning rows...",
  "Cleaning merchant names...",
  "Mapping categories...",
  "Calculating confidence...",
  "Analysis complete.",
];

// ── Parse CSV (handles quoted fields and common bank columns) ─────────────────

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === "," && !inQuotes) || (c === "\t" && !inQuotes)) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseAmount(val: string): number {
  const cleaned = String(val).replace(/\s/g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return 0;
  return n;
}

/** Find column index by header (case-insensitive, common EN/AR names) */
function findColumnIndex(headers: string[], ...names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const searchTerms = names.map((n) => n.toLowerCase().trim());
  return lower.findIndex((h) =>
    searchTerms.some((term) => h.includes(term) || term.includes(h))
  );
}

export function parseCSVToImportRows(csvText: string, defaultCurrency = "SAR"): ImportRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const dateIdx = findColumnIndex(headers, "date", "تاريخ", "posting", "value date");
  const amountIdx = findColumnIndex(headers, "amount", "مبلغ", "balance", "credit", "debit");
  const creditIdx = findColumnIndex(headers, "credit", "دائن");
  const debitIdx = findColumnIndex(headers, "debit", "مدين");
  const descIdx = findColumnIndex(headers, "description", "details", "narration", "وصف", "تفاصيل", "text");

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length < 2) continue;
    const date = dateIdx >= 0 ? cells[dateIdx]?.slice(0, 10) ?? "" : "";
    let amount = 0;
    if (amountIdx >= 0) {
      amount = parseAmount(cells[amountIdx] ?? "0");
    } else if (creditIdx >= 0 && debitIdx >= 0) {
      const credit = parseAmount(cells[creditIdx] ?? "0");
      const debit = parseAmount(cells[debitIdx] ?? "0");
      amount = credit > 0 ? credit : -debit;
    }
    const rawText = descIdx >= 0 ? (cells[descIdx] ?? "") : cells.slice(1).join(" ");
    const aiVendor = rawText.slice(0, 32).trim() || "—";
    rows.push({
      id: `row-${i}`,
      date: date || "—",
      rawText: rawText.slice(0, 120) || "—",
      amount,
      currency: defaultCurrency,
      aiCategory: "Other",
      aiVendor,
      aiConfidence: 85,
    });
  }
  return rows;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCSVImport() {
  const [stage, setStage]             = useState<ImportStage>("idle");
  const [progress, setProgress]       = useState(0);
  const [terminalLine, setTerminal]   = useState("");
  const [fileName, setFileName]       = useState("");
  const [rows, setRows]               = useState<ImportRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const terminalIdx = useRef(0);
  const uploadTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (uploadTimer.current)  clearInterval(uploadTimer.current);
    if (analyzeTimer.current) clearInterval(analyzeTimer.current);
  };

  // ── Phase 3: Read file and parse → review ───────────────────────────────────
  const startAnalyzing = useCallback((file: File) => {
    setStage("analyzing");
    setProgress(0);
    terminalIdx.current = 0;
    setTerminal(TERMINAL_LINES[0]);

    analyzeTimer.current = setInterval(() => {
      terminalIdx.current += 1;
      if (terminalIdx.current < TERMINAL_LINES.length) {
        setTerminal(TERMINAL_LINES[terminalIdx.current]);
      }
    }, 500);

    const analysisProgress = setInterval(() => {
      setProgress((p) => Math.min(p + 4, 95));
    }, 80);

    const finishWithRows = (parsedRows: ImportRow[]) => {
      clearInterval(analyzeTimer.current!);
      clearInterval(analysisProgress);
      setProgress(100);
      setRows(parsedRows);
      setStage("review");
    };

    const isCSV = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
    if (!isCSV) {
      setTimeout(() => finishWithRows(GCC_MOCK_ROWS), 1_800);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) ?? "";
      const parsed = parseCSVToImportRows(text);
      setTimeout(
        () => finishWithRows(parsed.length > 0 ? parsed : GCC_MOCK_ROWS),
        800
      );
    };
    reader.onerror = () => setTimeout(() => finishWithRows(GCC_MOCK_ROWS), 800);
    reader.readAsText(file, "UTF-8");
  }, []);

  // ── Phase 2: Uploading (0→100% in ~1.2s) ────────────────────────────────────
  const startUpload = useCallback((file: File) => {
    setFileName(file.name);
    setStage("uploading");
    setProgress(0);

    uploadTimer.current = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 12 + 10;
        if (next >= 100) {
          clearInterval(uploadTimer.current!);
          startAnalyzing(file);
          return 100;
        }
        return next;
      });
    }, 100);
  }, [startAnalyzing]);

  // ── onDrop: go to file_selected (preview) instead of uploading immediately ──
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setSelectedFile(accepted[0]);
      setFileName(accepted[0].name);
      setStage("file_selected");
    }
  }, []);

  // ── Start upload from the selected file (after user clicks "Upload & analyze") ──
  const startUploadFromSelection = useCallback(() => {
    if (selectedFile) {
      startUpload(selectedFile);
      setSelectedFile(null);
    }
  }, [selectedFile, startUpload]);

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
    setSelectedFile(null);
    terminalIdx.current = 0;
  }, []);

  const selectedFileSize = selectedFile != null ? selectedFile.size : 0;

  return {
    stage,
    progress,
    terminalLine,
    fileName,
    rows,
    selectedFile,
    selectedFileSize,
    onDrop,
    startUploadFromSelection,
    handleConfirm,
    handleReset,
  };
}
