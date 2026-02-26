/**
 * Export utilities for CSV download and PDF print.
 */

export function formatForExport(value: unknown, locale: string): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  if (typeof value === "number") {
    return value.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      maximumFractionDigits: 2,
    });
  }
  return String(value);
}

function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => escapeCSVField(String(row[h] ?? ""))).join(","),
  );

  const bom = "\uFEFF";
  const csv = bom + [headers.map(escapeCSVField).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const PRINT_CLASS = "__export-pdf-isolate";

export function exportToPDF(elementId: string, filename: string): void {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`exportToPDF: element #${elementId} not found`);
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    @media print {
      body.${PRINT_CLASS} > *:not(#${elementId}) {
        display: none !important;
      }
      body.${PRINT_CLASS} #${elementId} {
        position: static !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.classList.add(PRINT_CLASS);

  document.title = filename.replace(/\.pdf$/i, "");
  window.print();

  document.body.classList.remove(PRINT_CLASS);
  document.head.removeChild(style);
}

/** Export a chart/block element as PNG (uses html2canvas). */
export async function exportElementAsPNG(
  elementId: string,
  filename: string
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`exportElementAsPNG: element #${elementId} not found`);
    return;
  }
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: null,
  });
  const name = filename.endsWith(".png") ? filename : `${filename}.png`;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, "image/png");
}

/** Export a chart/block element as PDF (uses html2canvas + jspdf). */
export async function exportElementAsPDF(
  elementId: string,
  filename: string
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`exportElementAsPDF: element #${elementId} not found`);
    return;
  }
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgRatio = canvas.height / canvas.width;
  const pageRatio = pageH / pageW;
  const w = imgRatio > pageRatio ? pageW : pageH / imgRatio;
  const h = imgRatio > pageRatio ? pageW * imgRatio : pageH;
  pdf.addImage(imgData, "PNG", 0, 0, w, h);
  const name = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(name);
}
