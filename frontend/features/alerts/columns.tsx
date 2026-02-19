"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Alert, Severity, AlertStatus } from "./types";

// ── Config maps ────────────────────────────────────────────────────────────

export const SEVERITY_CONFIG: Record<
  Severity,
  { icon: typeof AlertTriangle; labelEn: string; labelAr: string; badge: string }
> = {
  high: {
    icon: AlertTriangle,
    labelEn: "High",
    labelAr: "عالي",
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400",
  },
  medium: {
    icon: AlertCircle,
    labelEn: "Medium",
    labelAr: "متوسط",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
  },
  low: {
    icon: Info,
    labelEn: "Low",
    labelAr: "منخفض",
    badge:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400",
  },
};

export const STATUS_CONFIG: Record<
  AlertStatus,
  { labelEn: string; labelAr: string; badge: string }
> = {
  open: {
    labelEn: "Open",
    labelAr: "مفتوح",
    badge: "bg-muted text-foreground border-border",
  },
  acknowledged: {
    labelEn: "Acknowledged",
    labelAr: "مُعترف به",
    badge:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400",
  },
  resolved: {
    labelEn: "Resolved",
    labelAr: "محلول",
    badge:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400",
  },
};

// ── Relative time helper ───────────────────────────────────────────────────

export function relativeTime(iso: string, isAr: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return isAr ? `منذ ${d} يوم` : `${d}d ago`;
  if (h > 0) return isAr ? `منذ ${h} ساعة` : `${h}h ago`;
  const m = Math.floor(diff / 60_000);
  if (m > 0) return isAr ? `منذ ${m} دقيقة` : `${m}m ago`;
  return isAr ? "الآن" : "just now";
}

// ── Column factory (locale-aware) ──────────────────────────────────────────

export function buildAlertColumns(isAr: boolean): ColumnDef<Alert, any>[] {
  return [
    // Checkbox
    {
      id: "select",
      size: 40,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : false
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },

    // Severity
    {
      id: "severity",
      accessorKey: "severity",
      size: 110,
      header: () => (
        <span>{isAr ? "الخطورة" : "Severity"}</span>
      ),
      cell: ({ getValue }) => {
        const sev = getValue<Severity>();
        const cfg = SEVERITY_CONFIG[sev];
        const Icon = cfg.icon;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium",
              cfg.badge
            )}
          >
            <Icon className="h-3 w-3" />
            {isAr ? cfg.labelAr : cfg.labelEn}
          </span>
        );
      },
      filterFn: (row, _id, filterValue: Severity[]) =>
        filterValue.length === 0 || filterValue.includes(row.original.severity),
    },

    // Title
    {
      id: "title",
      accessorFn: (row) => (isAr ? row.title_ar : row.title_en),
      header: () => <span>{isAr ? "التنبيه" : "Alert"}</span>,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground leading-snug">
            {isAr ? row.original.title_ar : row.original.title_en}
          </p>
          <p className="text-muted-foreground mt-0.5 line-clamp-1">
            {isAr ? row.original.description_ar : row.original.description_en}
          </p>
        </div>
      ),
    },

    // Status
    {
      id: "status",
      accessorKey: "status",
      size: 130,
      header: () => <span>{isAr ? "الحالة" : "Status"}</span>,
      cell: ({ getValue }) => {
        const status = getValue<AlertStatus>();
        const cfg = STATUS_CONFIG[status];
        return (
          <span
            className={cn(
              "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
              cfg.badge
            )}
          >
            {isAr ? cfg.labelAr : cfg.labelEn}
          </span>
        );
      },
      filterFn: (row, _id, filterValue: AlertStatus[]) =>
        filterValue.length === 0 || filterValue.includes(row.original.status),
    },

    // Time
    {
      id: "created_at",
      accessorKey: "created_at",
      size: 100,
      header: () => <span>{isAr ? "الوقت" : "Time"}</span>,
      cell: ({ getValue }) => (
        <span className="tabular-nums text-muted-foreground whitespace-nowrap">
          {relativeTime(getValue<string>(), isAr)}
        </span>
      ),
    },
  ];
}
