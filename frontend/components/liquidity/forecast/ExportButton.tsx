"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/ui/dropdown-menu";

interface ExportButtonProps {
  forecastData: Array<{
    month: string;
    inflow?: number;
    outflow?: number;
    balance?: number;
    forecast?: number;
  }>;
  isAr: boolean;
  currencyCode: string;
}

export function ExportButton({ forecastData, isAr, currencyCode }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = isAr
        ? ["الشهر", "التدفقات الداخلة", "التدفقات الخارجة", "الرصيد", "التوقع"]
        : ["Month", "Inflow", "Outflow", "Balance", "Forecast"];

      const rows = forecastData.map((row) => [
        row.month,
        row.inflow?.toString() || "0",
        row.outflow?.toString() || "0",
        row.balance?.toString() || "0",
        row.forecast?.toString() || "0",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `cashflow-forecast-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export to CSV failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      // Simple Excel export using HTML table format
      const headers = isAr
        ? ["الشهر", "التدفقات الداخلة", "التدفقات الخارجة", "الرصيد", "التوقع"]
        : ["Month", "Inflow", "Outflow", "Balance", "Forecast"];

      const rows = forecastData.map((row) => [
        row.month,
        row.inflow || 0,
        row.outflow || 0,
        row.balance || 0,
        row.forecast || 0,
      ]);

      let tableHTML = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `cashflow-forecast-${new Date().toISOString().split("T")[0]}.xls`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export to Excel failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      // Simple print-based PDF export
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert(isAr ? "يرجى السماح بالنوافذ المنبثقة" : "Please allow pop-ups");
        return;
      }

      const headers = isAr
        ? ["الشهر", "التدفقات الداخلة", "التدفقات الخارجة", "الرصيد", "التوقع"]
        : ["Month", "Inflow", "Outflow", "Balance", "Forecast"];

      const rows = forecastData.map((row) => [
        row.month,
        row.inflow?.toLocaleString() || "0",
        row.outflow?.toLocaleString() || "0",
        row.balance?.toLocaleString() || "0",
        row.forecast?.toLocaleString() || "0",
      ]);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${isAr ? "تقرير التنبؤ بالتدفق النقدي" : "Cash Flow Forecast Report"}</title>
          <style>
            @media print {
              @page { margin: 2cm; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              direction: ${isAr ? "rtl" : "ltr"};
            }
            h1 {
              text-align: center;
              color: #333;
              margin-bottom: 10px;
            }
            .meta {
              text-align: center;
              color: #666;
              margin-bottom: 30px;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: ${isAr ? "right" : "left"};
            }
            th {
              background-color: #4CAF50;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>${isAr ? "تقرير التنبؤ بالتدفق النقدي" : "Cash Flow Forecast Report"}</h1>
          <div class="meta">
            ${isAr ? "تاريخ التقرير" : "Report Date"}: ${new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US")}
            <br>
            ${isAr ? "العملة" : "Currency"}: ${currencyCode}
          </div>
          <table>
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
          <div class="footer">
            ${isAr ? "تم إنشاؤه بواسطة TadFuq.ai" : "Generated by TadFuq.ai"}
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        setIsExporting(false);
      }, 250);
    } catch (error) {
      console.error("Export to PDF failed:", error);
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          {isAr ? "تصدير" : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          {isAr ? "تصدير كـ PDF" : "Export as PDF"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {isAr ? "تصدير كـ Excel" : "Export as Excel"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {isAr ? "تصدير كـ CSV" : "Export as CSV"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
