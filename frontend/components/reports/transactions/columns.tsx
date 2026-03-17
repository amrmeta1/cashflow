"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/shared/ui/badge";
import { Button } from "@/components/shared/ui/button";
import { Checkbox } from "@/components/shared/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shared/ui/dropdown-menu";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ClientTrustBadge } from "./client-trust-badge";
import type { Transaction } from "./types";

const TYPE_STYLES: Record<Transaction["type"], string> = {
  inflow: "bg-emerald-50 text-emerald-700 border-emerald-200",
  outflow: "bg-red-50 text-red-700 border-red-200",
  transfer: "bg-sky-50 text-sky-700 border-sky-200",
};

const STATUS_STYLES: Record<Transaction["status"], string> = {
  cleared: "bg-zinc-100 text-zinc-600 border-zinc-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  reconciled: "bg-violet-50 text-violet-700 border-violet-200",
};

interface BuildColumnsOptions {
  isAr: boolean;
  locale: string;
  onEdit: (txn: Transaction) => void;
  onDelete: (txn: Transaction) => void;
}

export function buildTransactionColumns({
  isAr,
  locale,
  onEdit,
  onDelete,
}: BuildColumnsOptions): ColumnDef<Transaction>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
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
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "txn_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 h-7 text-xs font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {isAr ? "التاريخ" : "Date"}
          <ArrowUpDown className="ms-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ getValue }) => (
        <span className="tabular-nums text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(getValue<string>(), locale)}
        </span>
      ),
      size: 110,
    },
    {
      accessorKey: "description",
      header: () => (
        <span className="text-xs font-medium">{isAr ? "الوصف" : "Description"}</span>
      ),
      cell: ({ getValue, row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium max-w-[220px]">{getValue<string>()}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {row.original.counterparty.name}
            </p>
            <ClientTrustBadge
              counterparty={row.original.counterparty}
              isAr={isAr}
            />
          </div>
        </div>
      ),
    },
    {
      accessorKey: "account_name",
      header: () => (
        <span className="text-xs font-medium">{isAr ? "الحساب" : "Account"}</span>
      ),
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{getValue<string>()}</span>
      ),
      size: 140,
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 h-7 text-xs font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {isAr ? "الفئة" : "Category"}
          <ArrowUpDown className="ms-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ getValue }) => (
        <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
          {getValue<string>()}
        </Badge>
      ),
      size: 130,
    },
    {
      accessorKey: "type",
      header: () => (
        <span className="text-xs font-medium">{isAr ? "النوع" : "Type"}</span>
      ),
      cell: ({ getValue }) => {
        const v = getValue<Transaction["type"]>();
        const label = isAr
          ? v === "inflow" ? "وارد" : v === "outflow" ? "صادر" : "تحويل"
          : v.charAt(0).toUpperCase() + v.slice(1);
        return (
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", TYPE_STYLES[v])}>
            {label}
          </span>
        );
      },
      size: 90,
    },
    {
      accessorKey: "status",
      header: () => (
        <span className="text-xs font-medium">{isAr ? "الحالة" : "Status"}</span>
      ),
      cell: ({ getValue }) => {
        const v = getValue<Transaction["status"]>();
        const label = isAr
          ? v === "cleared" ? "مُسوَّى" : v === "pending" ? "معلق" : "مُطابَق"
          : v.charAt(0).toUpperCase() + v.slice(1);
        return (
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_STYLES[v])}>
            {label}
          </span>
        );
      },
      size: 100,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <div className="text-end">
          <Button
            variant="ghost"
            size="sm"
            className="-me-2 h-7 text-xs font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {isAr ? "المبلغ" : "Amount"}
            <ArrowUpDown className="ms-1 h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ getValue, row }) => {
        const v = getValue<number>();
        return (
          <div className="text-end">
            <span className={cn("tabular-nums text-sm font-semibold", v >= 0 ? "text-emerald-600" : "text-red-600")}>
              {v >= 0 ? "+" : ""}
              {formatCurrency(Math.abs(v), row.original.currency, locale)}
            </span>
          </div>
        );
      },
      size: 140,
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      size: 48,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="me-2 h-3.5 w-3.5" />
              {isAr ? "تعديل" : "Edit"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(row.original)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="me-2 h-3.5 w-3.5" />
              {isAr ? "حذف" : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
