"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Search, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/shared/ui/dropdown-menu";
import { useEntity, ENTITIES, entityBalanceInSAR } from "@/contexts/EntityContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const CONSOLIDATED_ID = "consolidated";

interface EntitySwitcherProps {
  /** Compact trigger for header (single line, smaller) */
  compact?: boolean;
}

export function EntitySwitcher({ compact }: EntitySwitcherProps = {}) {
  const { dir, locale } = useI18n();
  const isAr = locale === "ar";
  const { selectedId, setSelectedEntity, selectedEntity, totalGroupSAR, entities } = useEntity();
  const { fmt } = useCurrency();
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const displayLabel = useMemo(() => {
    if (selectedId === CONSOLIDATED_ID) {
      return isAr ? "العرض الموحّد" : "Consolidated View";
    }
    const e = selectedEntity;
    if (!e) return "—";
    return isAr ? e.nameAr : e.nameEn;
  }, [selectedId, selectedEntity, isAr]);

  const displayBalance = useMemo(() => {
    if (selectedId === CONSOLIDATED_ID) return fmt(totalGroupSAR);
    if (!selectedEntity) return "—";
    return fmt(entityBalanceInSAR(selectedEntity));
  }, [selectedId, selectedEntity, totalGroupSAR, fmt]);

  const displayFlag = selectedId === CONSOLIDATED_ID ? "📊" : selectedEntity?.flag ?? "🏢";

  const filteredEntities = useMemo(() => {
    if (!search.trim()) return entities;
    const q = search.trim().toLowerCase();
    return entities.filter(
      (e) =>
        e.nameEn.toLowerCase().includes(q) ||
        e.nameAr.includes(search.trim()),
    );
  }, [entities, search]);

  useEffect(() => {
    setSearch("");
  }, [selectedId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-lg border text-left transition-all duration-200",
            "bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md",
            "border-emerald-500/40 dark:border-emerald-400/30",
            "hover:border-emerald-500/60 dark:hover:border-emerald-400/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.12)]",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-background",
            compact
              ? "px-2.5 py-1.5 min-w-[140px] max-w-[200px]"
              : "px-3 py-2 min-w-[200px] max-w-[280px] rounded-xl shadow-[0_0_0_1px_rgba(16,185,129,0.08)] hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]",
          )}
        >
          <span className={cn("leading-none shrink-0", compact ? "text-base" : "text-lg")} aria-hidden>
            {displayFlag}
          </span>
          <div className="flex-1 min-w-0">
            <p className={cn("font-semibold text-foreground truncate", compact ? "text-xs" : "text-sm")}>
              {displayLabel}
            </p>
            <p className={cn("tabular-nums truncate font-medium text-emerald-600 dark:text-emerald-400", compact ? "text-[10px]" : "text-xs text-muted-foreground")}>
              {displayBalance}
            </p>
          </div>
          <ChevronDown className={cn("text-emerald-600 dark:text-emerald-400 shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isAr ? "end" : "start"}
        sideOffset={8}
        className={cn(
          "w-[320px] p-0 overflow-hidden rounded-xl border",
          "bg-white/85 dark:bg-zinc-900/90 backdrop-blur-xl",
          "border-emerald-500/30 dark:border-emerald-400/20",
          "shadow-xl shadow-emerald-950/10",
        )}
        onCloseAutoFocus={() => setSearch("")}
      >
        {/* Search */}
        <div className="p-2 border-b border-border/60">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground start-3" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "بحث عن كيان..." : "Search entities..."}
              className={cn(
                "w-full rounded-lg border border-border/80 bg-background/80 py-2 pe-3 ps-9 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50",
              )}
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {/* Consolidated option */}
          <EntityRow
            id={CONSOLIDATED_ID}
            flag="📊"
            nameEn="Consolidated View"
            nameAr="العرض الموحّد"
            balanceSAR={totalGroupSAR}
            isSelected={selectedId === CONSOLIDATED_ID}
            onSelect={() => setSelectedEntity(CONSOLIDATED_ID)}
            fmt={fmt}
            isAr={isAr}
            showTotalGroup
          />

          <AnimatePresence mode="popLayout">
            {filteredEntities.map((entity, index) => (
              <EntityRow
                key={entity.id}
                id={entity.id}
                flag={entity.flag}
                nameEn={entity.nameEn}
                nameAr={entity.nameAr}
                balanceSAR={entityBalanceInSAR(entity)}
                isSelected={selectedId === entity.id}
                onSelect={() => setSelectedEntity(entity.id)}
                fmt={fmt}
                isAr={isAr}
                index={index}
              />
            ))}
          </AnimatePresence>

          {filteredEntities.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {isAr ? "لا توجد نتائج" : "No results"}
            </p>
          )}
        </div>

        {/* Total Group footer when not consolidated */}
        {selectedId !== CONSOLIDATED_ID && (
          <div className="border-t border-border/60 px-3 py-2 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {isAr ? "إجمالي المجموعة:" : "Total Group:"}{" "}
              <span className="font-semibold text-foreground tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmt(totalGroupSAR)}
              </span>
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface EntityRowProps {
  id: string;
  flag: string;
  nameEn: string;
  nameAr: string;
  balanceSAR: number;
  isSelected: boolean;
  onSelect: () => void;
  fmt: (n: number) => string;
  isAr: boolean;
  index?: number;
  showTotalGroup?: boolean;
}

function EntityRow({
  flag,
  nameEn,
  nameAr,
  balanceSAR,
  isSelected,
  onSelect,
  fmt,
  isAr,
  index = 0,
  showTotalGroup,
}: EntityRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
        "hover:bg-emerald-500/10 dark:hover:bg-emerald-400/10",
        isSelected &&
          "bg-emerald-500/15 dark:bg-emerald-400/15 ring-1 ring-emerald-500/40 dark:ring-emerald-400/30",
      )}
    >
      <span className="text-xl leading-none shrink-0" aria-hidden>
        {flag}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {isAr ? nameAr : nameEn}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {isAr ? nameEn : nameAr}
        </p>
      </div>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums shrink-0",
          showTotalGroup || isSelected
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground",
        )}
      >
        {fmt(balanceSAR)}
      </span>
    </motion.div>
  );
}
