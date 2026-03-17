"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/shared/ui/input";
import { Button } from "@/components/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select";
import { CATEGORIES } from "./types";
import type { TransactionFilters, Category, TransactionType, TransactionStatus } from "./types";

interface TransactionsToolbarProps {
  filters: TransactionFilters;
  onFiltersChange: (f: TransactionFilters) => void;
  selectedCount: number;
  onBulkRecategorize: () => void;
  isAr: boolean;
}

export function TransactionsToolbar({
  filters,
  onFiltersChange,
  selectedCount,
  onBulkRecategorize,
  isAr,
}: TransactionsToolbarProps) {
  const hasFilters =
    !!filters.search ||
    !!filters.category ||
    !!filters.type ||
    !!filters.status ||
    !!filters.from ||
    !!filters.to;

  const set = (patch: Partial<TransactionFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  const clear = () =>
    onFiltersChange({ search: "", category: "", type: "", status: "", from: "", to: "" });

  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-b bg-card shrink-0">
      {/* Row 1: search + type/status/category filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => set({ search: e.target.value })}
            placeholder={isAr ? "بحث..." : "Search description, counterparty…"}
            className="ps-8 h-8 text-xs"
          />
        </div>

        <Select
          value={filters.type || "__all__"}
          onValueChange={(v) => set({ type: v === "__all__" ? "" : v as TransactionType })}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder={isAr ? "النوع" : "Type"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">{isAr ? "كل الأنواع" : "All types"}</SelectItem>
            <SelectItem value="inflow" className="text-xs">{isAr ? "وارد" : "Inflow"}</SelectItem>
            <SelectItem value="outflow" className="text-xs">{isAr ? "صادر" : "Outflow"}</SelectItem>
            <SelectItem value="transfer" className="text-xs">{isAr ? "تحويل" : "Transfer"}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status || "__all__"}
          onValueChange={(v) => set({ status: v === "__all__" ? "" : v as TransactionStatus })}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder={isAr ? "الحالة" : "Status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">{isAr ? "كل الحالات" : "All statuses"}</SelectItem>
            <SelectItem value="cleared" className="text-xs">{isAr ? "مُسوَّى" : "Cleared"}</SelectItem>
            <SelectItem value="pending" className="text-xs">{isAr ? "معلق" : "Pending"}</SelectItem>
            <SelectItem value="reconciled" className="text-xs">{isAr ? "مُطابَق" : "Reconciled"}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.category || "__all__"}
          onValueChange={(v) => set({ category: v === "__all__" ? "" : v as Category })}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder={isAr ? "الفئة" : "Category"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">{isAr ? "كل الفئات" : "All categories"}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => set({ from: e.target.value })}
            className="h-8 w-[130px] text-xs"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => set({ to: e.target.value })}
            className="h-8 w-[130px] text-xs"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clear}>
            <X className="h-3 w-3" />
            {isAr ? "مسح" : "Clear"}
          </Button>
        )}
      </div>

      {/* Row 2: bulk actions (only when rows selected) */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">
            {isAr ? `${selectedCount} محدد` : `${selectedCount} selected`}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs ms-auto"
            onClick={onBulkRecategorize}
          >
            {isAr ? "إعادة تصنيف" : "Re-categorize"}
          </Button>
        </div>
      )}
    </div>
  );
}
