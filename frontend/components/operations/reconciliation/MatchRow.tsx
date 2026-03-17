"use client";

import { useState } from "react";
import { Link2, CheckCircle2, XCircle, Sparkles, Tag } from "lucide-react";
import { Card } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { cn } from "@/lib/utils";
import type { MatchPair } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSAR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}SAR ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}SAR ${(abs / 1_000).toFixed(0)}k`;
  return `${sign}SAR ${abs.toLocaleString("en-US")}`;
}

function confidenceColor(score: number): string {
  if (score >= 95) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  if (score >= 80) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BankCard({ pair, isAr }: { pair: MatchPair; isAr: boolean }) {
  const { bankTxn } = pair;
  const isCredit = bankTxn.type === "credit";

  return (
    <Card className="p-4 bg-muted/30 border-s-4 border-s-blue-500 h-full flex flex-col justify-center gap-1.5">
      <p className="font-mono text-[11px] text-muted-foreground tracking-tight break-all">
        {bankTxn.desc}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {isAr ? bankTxn.dateAr : bankTxn.date}
      </p>
      <p
        className={cn(
          "text-lg font-bold tabular-nums tracking-tighter mt-0.5",
          isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
        )}
      >
        {isCredit ? "+" : ""}{fmtSAR(bankTxn.amount)}
      </p>
      <Badge
        variant="outline"
        className={cn(
          "self-start text-[10px] px-1.5 py-0 h-4 mt-0.5",
          isCredit
            ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            : "border-destructive/40 text-destructive bg-destructive/10"
        )}
      >
        {isCredit
          ? isAr ? "دائن" : "Credit"
          : isAr ? "مدين" : "Debit"}
      </Badge>
    </Card>
  );
}

function AIBridge({ pair, isAr }: { pair: MatchPair; isAr: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-1">
      <Badge
        variant="outline"
        className={cn("rounded-full px-3 py-1 gap-1 text-xs font-semibold", confidenceColor(pair.confidence))}
      >
        <Link2 className="h-3 w-3" />
        ✨ {pair.confidence}%
      </Badge>
      <p className="text-[10px] text-muted-foreground text-center max-w-[120px] leading-tight mt-0.5">
        {isAr ? pair.reasonAr : pair.reason}
      </p>
    </div>
  );
}

function LedgerCard({ pair, isAr }: { pair: MatchPair; isAr: boolean }) {
  if (pair.isFee || !pair.invoice) {
    return (
      <Card className="p-4 border-e-4 border-e-amber-500 h-full flex flex-col justify-center gap-1.5 border-dashed bg-muted/10">
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <Tag className="h-3.5 w-3.5 shrink-0" />
          <p className="text-xs font-semibold">
            {isAr ? "اقتراح AI" : "AI Suggestion"}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          {isAr
            ? "إنشاء فئة مصروف جديدة: 'مصاريف بنكية'"
            : "Create New Expense Category: 'Bank Charges'"}
        </p>
        <Badge
          variant="outline"
          className="self-start text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
        >
          {isAr ? "تصنيف تلقائي" : "Auto-Categorize"}
        </Badge>
      </Card>
    );
  }

  const { invoice } = pair;
  const clientName = isAr ? invoice.clientAr : invoice.client;

  return (
    <Card className="p-4 border-e-4 border-e-primary h-full flex flex-col justify-center gap-1.5">
      <p className="font-mono text-[11px] text-muted-foreground tracking-tight">
        {invoice.id}
      </p>
      <p className="text-sm font-semibold leading-tight">{clientName}</p>
      <p className="text-lg font-bold tabular-nums tracking-tighter text-foreground">
        {fmtSAR(invoice.amount)}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {isAr
          ? `تاريخ الاستحقاق: ${invoice.dueDateAr}`
          : `Due: ${invoice.dueDate}`}
      </p>
    </Card>
  );
}

// ── MatchRow ──────────────────────────────────────────────────────────────────

interface MatchRowProps {
  pair: MatchPair;
  isAr: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function MatchRow({ pair, isAr, onApprove, onReject }: MatchRowProps) {
  const [localStatus, setLocalStatus] = useState<"pending" | "approved" | "rejected">(
    pair.status
  );

  function handleApprove() {
    setLocalStatus("approved");
    onApprove(pair.id);
  }

  function handleReject() {
    setLocalStatus("rejected");
    onReject(pair.id);
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-4 items-stretch transition-opacity",
        localStatus === "approved" && "opacity-50",
        localStatus === "rejected" && "opacity-30"
      )}
    >
      {/* Col 1 — Bank */}
      <BankCard pair={pair} isAr={isAr} />

      {/* Col 2 — AI Bridge */}
      <AIBridge pair={pair} isAr={isAr} />

      {/* Col 3 — Ledger */}
      <LedgerCard pair={pair} isAr={isAr} />

      {/* Col 4 — Actions */}
      <div className="flex md:flex-col items-center justify-center gap-2">
        {localStatus === "pending" ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Approve"
              onClick={handleApprove}
              className="h-12 w-12 rounded-full hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
            >
              <CheckCircle2 className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Reject"
              onClick={handleReject}
              className="h-10 w-10 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </>
        ) : localStatus === "approved" ? (
          <div className="flex flex-col items-center gap-1">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {isAr ? "تمت" : "Done"}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <XCircle className="h-7 w-7 text-destructive/60" />
            <span className="text-[10px] text-muted-foreground font-medium">
              {isAr ? "مرفوض" : "Rejected"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
