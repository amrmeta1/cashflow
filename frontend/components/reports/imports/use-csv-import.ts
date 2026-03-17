"use client";
// Updated: 2026-03-15 00:09 - Fixed header parsing for Excel files

import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";

console.log("🔄 use-csv-import.ts loaded v4 - Excel support with improved date parsing");

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
  try {
    const lower = headers.map((h) => {
      const str = String(h || "");
      return str.toLowerCase().trim();
    });
    const searchTerms = names.map((n) => String(n || "").toLowerCase().trim());
    return lower.findIndex((h) => {
      if (!h || typeof h !== 'string') return false;
      return searchTerms.some((term) => {
        if (!term || typeof term !== 'string') return false;
        return h.includes(term) || term.includes(h);
      });
    });
  } catch (error) {
    console.error("Error in findColumnIndex:", error);
    return -1;
  }
}

/** Parse Excel file to ImportRows */
function parseExcelToImportRows(file: File, defaultCurrency = "SAR"): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        console.log("📊 Excel sheets found:", workbook.SheetNames);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        console.log("📊 Total rows in Excel:", jsonData.length);
        
        if (jsonData.length < 2) {
          console.warn("⚠️ Excel file has less than 2 rows");
          resolve([]);
          return;
        }

        // Convert all headers to strings and normalize
        const rawHeaders = jsonData[0] || [];
        const headers = rawHeaders.map((h: any) => {
          if (h === null || h === undefined) return "";
          return String(h).toLowerCase().trim();
        });
        console.log("📊 Excel headers (raw):", rawHeaders.slice(0, 10));
        console.log("📊 Excel headers (normalized):", headers.slice(0, 10));
        
        // Try to find column indices
        let dateIdx = findColumnIndex(headers, "date", "تاريخ", "posting", "value date", "posting date");
        let amountIdx = findColumnIndex(headers, "amount", "مبلغ", "balance", "net change");
        let creditIdx = findColumnIndex(headers, "credit", "دائن");
        let debitIdx = findColumnIndex(headers, "debit", "مدين");
        let descIdx = findColumnIndex(headers, "description", "details", "narration", "وصف", "تفاصيل", "text", "external document no", "external");

        console.log("📊 Column indices - Date:", dateIdx, "Amount:", amountIdx, "Credit:", creditIdx, "Debit:", debitIdx, "Desc:", descIdx);

        // If no columns found, assume no header row - use positional indices
        let startRow = 1;
        if (dateIdx === -1 && amountIdx === -1 && descIdx === -1) {
          console.warn("⚠️ No headers detected - assuming data starts from row 1");
          // Common bank statement format: Date, Doc No, Description, Debit, Credit
          startRow = 0;
          dateIdx = 0;  // First column is usually date
          descIdx = 2;  // Third column is usually description
          debitIdx = 3; // Fourth column is usually debit
          creditIdx = 4; // Fifth column is usually credit
        }

        const rows: ImportRow[] = [];
        for (let i = startRow; i < jsonData.length; i++) {
          const cells = jsonData[i];
          if (!cells || cells.length < 2) continue;
          
          let date = "";
          if (dateIdx >= 0 && cells[dateIdx]) {
            const dateVal = cells[dateIdx];
            if (typeof dateVal === "number") {
              // Excel date number
              const excelDate = XLSX.SSF.parse_date_code(dateVal);
              date = `${excelDate.y}-${String(excelDate.m).padStart(2, "0")}-${String(excelDate.d).padStart(2, "0")}`;
            } else if (dateVal instanceof Date) {
              // JavaScript Date object
              date = dateVal.toISOString().slice(0, 10);
            } else {
              // String date - try to parse it
              const dateStr = String(dateVal).trim();
              // Try various date formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
              const dateMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
              if (dateMatch) {
                let [, p1, p2, p3] = dateMatch;
                // Assume DD/MM/YYYY format for now
                const day = p1.padStart(2, "0");
                const month = p2.padStart(2, "0");
                const year = p3.length === 2 ? `20${p3}` : p3;
                date = `${year}-${month}-${day}`;
              }
            }
          }
          
          // Skip rows without valid dates
          if (!date || date === "—" || date.includes("undefined")) {
            continue;
          }
          
          let amount = 0;
          if (amountIdx >= 0) {
            amount = parseAmount(String(cells[amountIdx] ?? "0"));
          } else if (creditIdx >= 0 && debitIdx >= 0) {
            const credit = parseAmount(String(cells[creditIdx] ?? "0"));
            const debit = parseAmount(String(cells[debitIdx] ?? "0"));
            amount = credit > 0 ? credit : -debit;
          }
          
          const rawText = descIdx >= 0 ? String(cells[descIdx] ?? "") : cells.slice(1).join(" ");
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
        console.log("✅ Parsed", rows.length, "rows from Excel");
        if (rows.length > 0) {
          console.log("📊 Sample row:", rows[0]);
        }
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function parseCSVToImportRows(csvText: string, defaultCurrency = "SAR"): ImportRow[] {
  console.log("📊 parseCSVToImportRows called");
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  console.log("📊 Total lines:", lines.length);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  console.log("📊 CSV Headers:", headers);
  const dateIdx = findColumnIndex(headers, "date", "تاريخ", "posting", "value date");
  const amountIdx = findColumnIndex(headers, "amount", "مبلغ", "balance", "credit", "debit");
  const creditIdx = findColumnIndex(headers, "credit", "دائن");
  const debitIdx = findColumnIndex(headers, "debit", "مدين");
  const descIdx = findColumnIndex(headers, "description", "details", "narration", "وصف", "تفاصيل", "text");
  
  console.log("📊 Column indices - Date:", dateIdx, "Amount:", amountIdx, "Credit:", creditIdx, "Debit:", debitIdx, "Desc:", descIdx);

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    console.log(`📊 Row ${i}:`, cells);
    if (cells.length < 2) {
      console.log(`⚠️ Row ${i} skipped - less than 2 cells`);
      continue;
    }
    const date = dateIdx >= 0 ? cells[dateIdx]?.slice(0, 10) ?? "" : "";
    let amount = 0;
    if (amountIdx >= 0) {
      amount = parseAmount(cells[amountIdx] ?? "0");
      console.log(`📊 Row ${i} - Using amount column:`, amount);
    } else if (creditIdx >= 0 && debitIdx >= 0) {
      const credit = parseAmount(cells[creditIdx] ?? "0");
      const debit = parseAmount(cells[debitIdx] ?? "0");
      // FIXED: Credit is positive, Debit is negative
      amount = credit - debit;
      console.log(`📊 Row ${i} - Credit: ${credit}, Debit: ${debit}, Amount: ${amount}`);
    }
    const rawText = descIdx >= 0 ? (cells[descIdx] ?? "") : cells.slice(1).join(" ");
    const aiVendor = rawText.slice(0, 32).trim() || "—";
    
    console.log(`✅ Row ${i} parsed - Date: ${date}, Amount: ${amount}, Description: ${rawText.slice(0, 30)}`);
    
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
  console.log(`📊 Total rows parsed: ${rows.length}`);
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
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const terminalIdx = useRef(0);
  const uploadTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (uploadTimer.current)  clearInterval(uploadTimer.current);
    if (analyzeTimer.current) clearInterval(analyzeTimer.current);
  };

  // ── Phase 3: Read file and parse → review ───────────────────────────────────
  const startAnalyzing = useCallback((file: File) => {
    console.log("🔍 startAnalyzing called with file:", file.name, "size:", file.size, "type:", file.type);
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

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    const isCSV = fileName.endsWith(".csv") || file.type === "text/csv";
    const isPDF = fileName.endsWith(".pdf") || file.type === "application/pdf";
    console.log("🔍 File check - isExcel:", isExcel, "isCSV:", isCSV, "isPDF:", isPDF, "fileName:", fileName);

    if (isPDF) {
      console.log("📄 PDF detected - will be sent directly to backend for parsing");
      // PDF files are parsed by backend, not frontend
      // Create a dummy row to indicate PDF upload
      clearInterval(analyzeTimer.current!);
      clearInterval(analysisProgress);
      setProgress(100);
      setTerminal("✅ PDF detected - ready for server-side parsing");
      
      // Create a single placeholder row to indicate PDF
      const pdfPlaceholder: ImportRow = {
        id: "pdf-placeholder",
        date: new Date().toISOString().slice(0, 10),
        rawText: `📄 PDF File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        amount: 0,
        currency: "SAR",
        aiCategory: "PDF_UPLOAD",
        aiVendor: "PDF Document",
        aiConfidence: 100,
      };
      
      setTimeout(() => finishWithRows([pdfPlaceholder]), 800);
    } else if (isExcel) {
      console.log("📊 Starting Excel parsing...");
      // Parse Excel file
      parseExcelToImportRows(file)
        .then((parsed) => {
          setTimeout(() => finishWithRows(parsed), 800);
        })
        .catch((error) => {
          console.error("Excel parsing error:", error);
          clearInterval(analyzeTimer.current!);
          clearInterval(analysisProgress);
          setProgress(100);
          setRows([]);
          setStage("idle");
        });
    } else if (isCSV) {
      // Parse CSV file
      const reader = new FileReader();
      reader.onload = () => {
        const text = (reader.result as string) ?? "";
        const parsed = parseCSVToImportRows(text);
        setTimeout(() => finishWithRows(parsed), 800);
      };
      reader.onerror = () => {
        clearInterval(analyzeTimer.current!);
        clearInterval(analysisProgress);
        setProgress(100);
        setRows([]);
        setStage("idle");
      };
      reader.readAsText(file, "UTF-8");
    } else {
      // Unsupported file type
      console.error("❌ Unsupported file type:", file.type, file.name);
      clearInterval(analyzeTimer.current!);
      clearInterval(analysisProgress);
      setProgress(100);
      setRows([]);
      setStage("idle");
    }
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
      setOriginalFile(accepted[0]); // Store for PDF uploads
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

  // ── Update category for a specific row ────────────────────────────────────
  const updateRowCategory = useCallback((rowId: string, newCategory: string) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId ? { ...row, aiCategory: newCategory } : row
      )
    );
  }, []);

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

  return {
    stage,
    progress,
    terminalLine,
    fileName,
    rows,
    selectedFileSize: selectedFile?.size ?? 0,
    originalFile,
    onDrop,
    startUploadFromSelection,
    handleReset,
    updateRowCategory,
  };
}
