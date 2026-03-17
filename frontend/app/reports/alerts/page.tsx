"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { type ColumnFiltersState, type RowSelectionState } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { DataTable } from "@/components/shared/ui/data-table";
import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useToast } from "@/components/shared/ui/toast";
// TODO: Restore when alert components are available
// import { useAlerts, useAlertAction } from "@/components/reports/alerts/hooks";
// import { buildAlertColumns } from "@/components/reports/alerts/columns";
// import { AlertSheet } from "@/components/reports/alerts/alert-sheet";
// import { AlertsToolbar } from "@/components/reports/alerts/alerts-toolbar";
// import type { Alert, Severity, AlertStatus } from "@/components/reports/alerts/types";

type Alert = any;
type Severity = string;
type AlertStatus = string;

export default function AlertsPage() {
  const { locale, dir } = useI18n();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAr = locale === "ar";

  // ── URL-synced filters ─────────────────────────────────────────────────
  const severityParam = searchParams.get("severity");
  const statusParam = searchParams.get("status");

  const severityFilter: Severity[] = useMemo(
    () => (severityParam ? (severityParam.split(",") as Severity[]) : []),
    [severityParam]
  );
  const statusFilter: AlertStatus[] = useMemo(
    () => (statusParam ? (statusParam.split(",") as AlertStatus[]) : []),
    [statusParam]
  );

  const updateURL = useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (values.length > 0) {
        params.set(key, values.join(","));
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // ── Local UI state ─────────────────────────────────────────────────────
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // ── Data & mutations ───────────────────────────────────────────────────
  // TODO: Restore when alert hooks are available
  // const { data: alerts = [], isLoading, refetch } = useAlerts(currentTenant?.id);
  // const { mutate: doAction } = useAlertAction(currentTenant?.id);
  const alerts: Alert[] = [];
  const isLoading = false;
  const refetch = () => {};
  const doAction = (_params: any) => {};

  // ── Derived filtered data (for count display) ──────────────────────────
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (severityFilter.length > 0 && !severityFilter.includes(a.severity)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(a.status)) return false;
      return true;
    });
  }, [alerts, severityFilter, statusFilter]);

  // ── TanStack column filters (drives the DataTable internally) ─────────
  const columnFilters: ColumnFiltersState = useMemo(() => {
    const filters: ColumnFiltersState = [];
    if (severityFilter.length > 0) filters.push({ id: "severity", value: severityFilter });
    if (statusFilter.length > 0) filters.push({ id: "status", value: statusFilter });
    return filters;
  }, [severityFilter, statusFilter]);

  // ── Columns ────────────────────────────────────────────────────────────
  // TODO: Restore when alert columns are available
  // const columns = useMemo(() => buildAlertColumns(isAr), [isAr]);
  const columns = useMemo(() => [], [isAr]);

  // ── Bulk resolve ───────────────────────────────────────────────────────
  const handleBulkResolve = useCallback(() => {
    const ids = Object.keys(rowSelection);
    ids.forEach((id) => doAction({ id, action: "resolve" }));
    setRowSelection({});
    toast({
      title: isAr ? `تم حل ${ids.length} تنبيهات` : `Resolved ${ids.length} alerts`,
      variant: "success",
    });
  }, [rowSelection, doAction, toast, isAr]);

  const openCount = alerts.filter((a) => a.status === "open").length;
  const selectedCount = Object.keys(rowSelection).length;
  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? null;

  return (
    <div dir={dir} className="flex flex-col h-full" data-page-full>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">
            {isAr ? "مركز التنبيهات" : "Alert Center"}
          </h1>
          {openCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-semibold px-1.5">
              {openCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Toolbar with filters ── */}
      {/* TODO: Restore when AlertsToolbar is available */}
      {/* <AlertsToolbar
        severityFilter={severityFilter}
        statusFilter={statusFilter}
        onSeverityChange={(v) => updateURL("severity", v)}
        onStatusChange={(v) => updateURL("status", v)}
        onRefresh={() => refetch()}
        totalCount={alerts.length}
        filteredCount={filteredAlerts.length}
        selectedCount={selectedCount}
        onBulkResolve={handleBulkResolve}
        isAr={isAr}
      /> */}

      {/* ── Data table ── */}
      <div className="flex-1 overflow-auto">
        <DataTable<Alert>
          columns={columns}
          data={alerts}
          isLoading={isLoading}
          skeletonRows={6}
          getRowId={(row) => row.id}
          columnFilters={columnFilters}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onRowClick={(row) =>
            setSelectedAlertId((prev) => (prev === row.id ? null : row.id))
          }
          selectedRowId={selectedAlertId}
          emptyState={
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 opacity-30" />
              <p className="text-sm">
                {isAr ? "لا توجد تنبيهات" : "No alerts match your filters"}
              </p>
            </div>
          }
        />
      </div>

      {/* ── Detail Sheet ── */}
      {/* TODO: Restore when AlertSheet is available */}
      {/* <AlertSheet
        alert={selectedAlert}
        onClose={() => setSelectedAlertId(null)}
        tenantId={currentTenant?.id}
        isAr={isAr}
        locale={locale}
        dir={dir}
      /> */}
    </div>
  );
}
