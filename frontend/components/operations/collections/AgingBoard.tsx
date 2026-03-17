"use client";

import { MessageCircle, Clock, Star, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { cn } from "@/lib/utils";
import {
  RECEIVABLES,
  BUCKET_META,
  type AgingBucket,
  type Receivable,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSAR(n: number): string {
  if (n >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `SAR ${(n / 1_000).toFixed(0)}k`;
  return `SAR ${n.toLocaleString("en-US")}`;
}

const TYPE_ICON: Record<Receivable["type"], React.ReactNode> = {
  vip: <Star className="h-3 w-3 text-amber-500 fill-amber-500" />,
  regular: null,
  high_risk: <AlertTriangle className="h-3 w-3 text-destructive" />,
};

// ── Invoice Card ──────────────────────────────────────────────────────────────

interface InvoiceCardProps {
  receivable: Receivable;
  isAr: boolean;
  onGenerate: (r: Receivable) => void;
  fmt: (n: number) => string;
}

function InvoiceCard({ receivable, isAr, onGenerate, fmt }: InvoiceCardProps) {
  const meta = BUCKET_META[receivable.status];
  const isOverdue = receivable.daysOverdue > 0;
  const clientName = isAr ? receivable.clientAr : receivable.client;

  return (
    <Card
      className={cn(
        "border-s-4 transition-shadow hover:shadow-md",
        meta.accent
      )}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {TYPE_ICON[receivable.type]}
            <CardTitle className="text-sm font-semibold leading-tight truncate">
              {clientName}
            </CardTitle>
          </div>
          {isOverdue && (
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 h-4 shrink-0 font-medium", meta.badgeClass)}
            >
              {isAr
                ? `${receivable.daysOverdue} يوم`
                : `${receivable.daysOverdue}d`}
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
          {receivable.invoiceRef}
        </p>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Amount */}
        <p className={cn(
          "text-lg font-bold tabular-nums tracking-tighter",
          receivable.status === "overdue_90" ? "text-destructive" : "text-foreground"
        )}>
          {fmt(receivable.amount)}
        </p>

        {/* Due status row */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          {isOverdue
            ? isAr
              ? `متأخرة منذ ${receivable.daysOverdue} يوماً`
              : `Overdue by ${receivable.daysOverdue} days`
            : isAr
            ? "في الموعد المحدد"
            : "Within payment terms"}
        </div>

        {/* WhatsApp CTA — only on overdue invoices */}
        {isOverdue && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full gap-1.5 text-xs font-medium mt-1",
              "text-emerald-600 dark:text-emerald-400",
              "border-emerald-500/50",
              "hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300",
              "transition-colors"
            )}
            onClick={() => onGenerate(receivable)}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {isAr ? "📱 توليد رسالة واتساب AI" : "📱 Generate AI WhatsApp"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

const BUCKET_ORDER: AgingBucket[] = [
  "current",
  "overdue_1_30",
  "overdue_31_60",
  "overdue_90",
];

interface AgingColumnProps {
  bucket: AgingBucket;
  receivables: Receivable[];
  isAr: boolean;
  onGenerate: (r: Receivable) => void;
  fmt: (n: number) => string;
}

function AgingColumn({ bucket, receivables, isAr, onGenerate, fmt }: AgingColumnProps) {
  const meta = BUCKET_META[bucket];
  const label = meta.label[isAr ? "ar" : "en"];
  const total = receivables.reduce((s, r) => s + r.amount, 0);
  const isCritical = bucket === "overdue_90";

  return (
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center justify-between gap-2">
        <h3
          className={cn(
            "text-xs font-semibold uppercase tracking-widest",
            isCritical ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {label}
        </h3>
        {receivables.length > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground font-medium">
            {fmt(total)}
          </span>
        )}
      </div>

      {/* Divider with accent color */}
      <div
        className={cn(
          "h-0.5 w-full rounded-full",
          bucket === "current" && "bg-emerald-500/40",
          bucket === "overdue_1_30" && "bg-amber-500/40",
          bucket === "overdue_31_60" && "bg-orange-500/40",
          bucket === "overdue_90" && "bg-destructive/40"
        )}
      />

      {/* Invoice cards */}
      {receivables.length === 0 ? (
        <p className="text-xs text-muted-foreground/50 text-center py-6">
          {isAr ? "لا توجد فواتير" : "No invoices"}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {receivables.map((r) => (
            <InvoiceCard
              key={r.id}
              receivable={r}
              isAr={isAr}
              onGenerate={onGenerate}
              fmt={fmt}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────

interface AgingBoardProps {
  isAr: boolean;
  onGenerate: (r: Receivable) => void;
  fmt: (n: number) => string;
}

export function AgingBoard({ isAr, onGenerate, fmt }: AgingBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {BUCKET_ORDER.map((bucket) => (
        <AgingColumn
          key={bucket}
          bucket={bucket}
          receivables={RECEIVABLES.filter((r) => r.status === bucket)}
          isAr={isAr}
          onGenerate={onGenerate}
          fmt={fmt}
        />
      ))}
    </div>
  );
}
