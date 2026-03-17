"use client";

import { useRef, useCallback, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Download, FileImage, FileText } from "lucide-react";
import { Button } from "@/components/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ChartExportButtonProps {
  /** Ref to the chart container element (e.g. a div wrapping ResponsiveContainer). */
  chartRef: React.RefObject<HTMLElement | null>;
  /** Base filename for download (without extension). */
  downloadLabel?: string;
  /** Use Arabic labels for menu items. */
  isAr?: boolean;
  /** Optional class for the trigger button. */
  className?: string;
}

const LABELS = {
  export: { en: "Export", ar: "تصدير" },
  png: { en: "Export PNG", ar: "تصدير PNG" },
  pdf: { en: "Export PDF", ar: "تصدير PDF" },
};

export function ChartExportButton({
  chartRef,
  downloadLabel = "chart",
  isAr = false,
  className,
}: ChartExportButtonProps) {
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  const captureCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const el = chartRef.current;
    if (!el) return null;
    return html2canvas(el, {
      useCORS: true,
      scale: 2,
      backgroundColor: undefined,
      logging: false,
    });
  }, [chartRef]);

  const handleExportPng = useCallback(async () => {
    setExporting("png");
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${downloadLabel}.png`;
      a.click();
    } finally {
      setExporting(null);
    }
  }, [captureCanvas, downloadLabel]);

  const handleExportPdf = useCallback(async () => {
    setExporting("pdf");
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png");
      const isLandscape = canvas.width > canvas.height;
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      let w = pageW;
      let h = pageW * (canvas.height / canvas.width);
      if (h > pageH) {
        h = pageH;
        w = pageH * (canvas.width / canvas.height);
      }
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      pdf.addImage(imgData, "PNG", x, y, w, h);
      pdf.save(`${downloadLabel}.pdf`);
    } finally {
      setExporting(null);
    }
  }, [captureCanvas, downloadLabel]);

  const t = isAr ? "ar" : "en";
  const exportLabel = LABELS.export[t];
  const pngLabel = LABELS.png[t];
  const pdfLabel = LABELS.pdf[t];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "text-[#0e7490] border-[#0e7490]/40 hover:bg-[#0e7490]/10 hover:border-[#0e7490]/60",
            className
          )}
          disabled={!!exporting}
        >
          <Download className="h-4 w-4 me-1.5" />
          {exportLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isAr ? "start" : "end"}>
        <DropdownMenuItem onClick={handleExportPng} disabled={exporting === "png"}>
          <FileImage className="h-4 w-4 me-2" />
          {pngLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPdf} disabled={exporting === "pdf"}>
          <FileText className="h-4 w-4 me-2" />
          {pdfLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
