"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowLeftRight, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { DataTable } from "@/components/shared/ui/data-table";
import { Button } from "@/components/shared/ui/button";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useToast } from "@/components/shared/ui/toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { useTransactions, useUpdateTransaction, useBulkRecategorize, useDeleteTransaction } from "@/components/reports/transactions/hooks";
import { buildTransactionColumns } from "@/components/reports/transactions/columns";
import { TransactionsToolbar } from "@/components/reports/transactions/transactions-toolbar";
import { EditDialog } from "@/components/reports/transactions/edit-dialog";
import { BulkRecategorizeDialog } from "@/components/reports/transactions/bulk-recategorize-dialog";
import type { Transaction, TransactionFilters, UpdateTransactionPayload, Category } from "@/components/reports/transactions/types";

export default function TransactionsPage() {
  const { locale, dir } = useI18n();
  const { fmt } = useCurrency();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const isAr = locale === "ar";

  const [filters, setFilters] = useState<TransactionFilters>({});
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteTxn, setDeleteTxn] = useState<Transaction | null>(null);

  const { data: transactions = [], isLoading } = useTransactions(currentTenant?.id, filters);
  const updateMutation = useUpdateTransaction(currentTenant?.id);
  const bulkMutation = useBulkRecategorize(currentTenant?.id);
  const deleteMutation = useDeleteTransaction(currentTenant?.id);

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
  const selectedCount = selectedIds.length;

  const handleEdit = useCallback((txn: Transaction) => {
    setEditTxn(txn);
    setEditOpen(true);
  }, []);

  const handleDelete = useCallback((txn: Transaction) => {
    setDeleteTxn(txn);
    deleteMutation.mutate(txn.id, {
      onSuccess: () => {
        toast({ title: isAr ? "تم حذف المعاملة" : "Transaction deleted", variant: "success" });
        setDeleteTxn(null);
      },
    });
  }, [deleteMutation, toast, isAr]);

  const handleSaveEdit = useCallback((id: string, payload: UpdateTransactionPayload) => {
    updateMutation.mutate({ id, payload }, {
      onSuccess: () => {
        toast({ title: isAr ? "تم تحديث المعاملة" : "Transaction updated", variant: "success" });
        setEditOpen(false);
        setEditTxn(null);
      },
    });
  }, [updateMutation, toast, isAr]);

  const handleBulkRecategorize = useCallback((category: Category) => {
    bulkMutation.mutate({ ids: selectedIds, category }, {
      onSuccess: () => {
        toast({
          title: isAr
            ? `تم تصنيف ${selectedIds.length} معاملة`
            : `Re-categorized ${selectedIds.length} transactions`,
          variant: "success",
        });
        setBulkOpen(false);
        setRowSelection({});
      },
    });
  }, [bulkMutation, selectedIds, toast, isAr]);

  const handleExport = useCallback(() => {
    if (!transactions.length) return;
    const headers = ["Date", "Description", "Counterparty", "Category", "Type", "Status", "Amount", "Currency", "Account"];
    const rows = transactions.map((tx) => [
      tx.txn_date, tx.description, tx.counterparty, tx.category,
      tx.type, tx.status, tx.amount, tx.currency, tx.account_name,
    ]);
    const csv = [headers, ...rows].map((r) => r.map(String).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions]);

  const columns = useMemo(
    () => buildTransactionColumns({ isAr, locale, onEdit: handleEdit, onDelete: handleDelete }),
    [isAr, locale, handleEdit, handleDelete]
  );

  const totalInflow = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOutflow = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = totalInflow - totalOutflow;

  return (
    <div dir={dir} className="flex flex-col h-full" data-page-full>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">
            {isAr ? "المعاملات" : "Transactions"}
          </h1>
          {!isLoading && (
            <span className="text-xs text-muted-foreground">
              ({transactions.length})
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={handleExport}
          disabled={!transactions.length}
        >
          <Download className="h-3.5 w-3.5" />
          {isAr ? "تصدير CSV" : "Export CSV"}
        </Button>
      </div>

      {/* ── KPI strip ── */}
      {isLoading ? (
        <div className="flex gap-px border-b shrink-0">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 flex-1 rounded-none" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 border-b shrink-0">
          {[
            {
              label: isAr ? "إجمالي الواردات" : "Total Inflows",
              value: totalInflow,
              icon: TrendingUp,
              color: "text-emerald-600",
            },
            {
              label: isAr ? "إجمالي الصادرات" : "Total Outflows",
              value: totalOutflow,
              icon: TrendingDown,
              color: "text-red-600",
            },
            {
              label: isAr ? "صافي التدفق" : "Net Cash Flow",
              value: net,
              icon: DollarSign,
              color: net >= 0 ? "text-emerald-600" : "text-red-600",
            },
          ].map((kpi, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-e last:border-e-0">
              <kpi.icon className={cn("h-4 w-4 shrink-0", kpi.color)} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={cn("text-base font-semibold tabular-nums", kpi.color)}>
                  {net < 0 && kpi.label.includes("Net") ? "-" : ""}
                  {fmt(Math.abs(kpi.value))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ── */}
      <TransactionsToolbar
        filters={filters}
        onFiltersChange={setFilters}
        selectedCount={selectedCount}
        onBulkRecategorize={() => setBulkOpen(true)}
        isAr={isAr}
      />

      {/* ── Table ── */}
      <div className="flex-1 overflow-hidden">
        <DataTable
          columns={columns}
          data={transactions}
          isLoading={isLoading}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
          emptyState={
            <p className="text-sm text-muted-foreground">
              {isAr ? "لا توجد معاملات" : "No transactions found"}
            </p>
          }
        />
      </div>

      {/* ── Edit dialog ── */}
      <EditDialog
        txn={editTxn}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleSaveEdit}
        isPending={updateMutation.isPending}
        isAr={isAr}
      />

      {/* ── Bulk recategorize dialog ── */}
      <BulkRecategorizeDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selectedCount={selectedCount}
        onConfirm={handleBulkRecategorize}
        isPending={bulkMutation.isPending}
        isAr={isAr}
      />
    </div>
  );
}
