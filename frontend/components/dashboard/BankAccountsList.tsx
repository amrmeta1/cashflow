import { useState, useCallback } from "react";
import Link from "next/link";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BankAccount {
  nameEn: string;
  nameAr: string;
  balance: number;
  share: number;
}

interface BankAccountsListProps {
  accounts: BankAccount[];
  currency: string;
  isAr: boolean;
  title: string;
  showAllLabel: string;
  showLessLabel: string;
  ofTotalLabel: string;
  cashPositioningLabel: string;
  visibleCount?: number;
}

export function BankAccountsList({
  accounts,
  currency,
  isAr,
  title,
  showAllLabel,
  showLessLabel,
  ofTotalLabel,
  cashPositioningLabel,
  visibleCount = 2,
}: BankAccountsListProps) {
  const [showAll, setShowAll] = useState(false);

  const toggleShowAll = useCallback(() => {
    setShowAll((prev) => !prev);
  }, []);

  const visibleAccounts = showAll ? accounts : accounts.slice(0, visibleCount);
  const hasMore = accounts.length > visibleCount;

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        {visibleAccounts.map((acc) => (
          <div key={acc.nameEn}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">
                  {isAr ? acc.nameAr : acc.nameEn}
                </span>
              </div>
              <span
                suppressHydrationWarning
                className="text-sm font-semibold tabular-nums ms-auto ps-4"
              >
                {currency} {acc.balance.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${(acc.share * 100).toFixed(0)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {(acc.share * 100).toFixed(0)}% {ofTotalLabel}
            </p>
          </div>
        ))}
        {hasMore && (
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <button
              type="button"
              onClick={toggleShowAll}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  {showLessLabel}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  {showAllLabel} ({accounts.length})
                </>
              )}
            </button>
            <Link
              href="/app/cash-positioning"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {cashPositioningLabel} →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
