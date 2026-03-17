"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Filter } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { listAuditLogs } from "@/lib/api/enterprise-api";
import type { AuditLog } from "@/lib/api/types";
import { DataTable } from "@/components/shared/ui/data-table";
import { Button } from "@/components/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Input } from "@/components/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/ui/select";
import { type ColumnDef } from "@tanstack/react-table";

function formatAction(action: string): string {
  return action
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getActionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("delete") || action.includes("remove")) return "destructive";
  if (action.includes("create") || action.includes("add")) return "default";
  if (action.includes("update") || action.includes("edit")) return "secondary";
  return "outline";
}

export default function AuditLogsPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const [dateRange, setDateRange] = useState<string>("7d");
  const [userFilter, setUserFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => listAuditLogs(100, 0),
  });

  const columns: ColumnDef<AuditLog>[] = useMemo(() => [
    {
      accessorKey: "occurred_at",
      header: isAr ? "التاريخ والوقت" : "Timestamp",
      cell: ({ row }) => {
        const date = new Date(row.original.occurred_at);
        return (
          <div className="text-xs">
            <div className="font-medium">
              {date.toLocaleDateString(isAr ? "ar-SA" : "en-GB", { 
                day: "2-digit", 
                month: "short", 
                year: "numeric" 
              })}
            </div>
            <div className="text-muted-foreground">
              {date.toLocaleTimeString(isAr ? "ar-SA" : "en-GB", { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </div>
          </div>
        );
      },
      size: 180,
    },
    {
      accessorKey: "actor_sub",
      header: isAr ? "المستخدم" : "User",
      cell: ({ row }) => (
        <div className="text-xs font-medium">
          {row.original.actor_sub}
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: "action",
      header: isAr ? "الإجراء" : "Action",
      cell: ({ row }) => {
        const action = row.original.action;
        const variant = getActionVariant(action);
        return (
          <Badge variant={variant} className="text-xs">
            {formatAction(action)}
          </Badge>
        );
      },
      size: 150,
    },
    {
      accessorKey: "entity_type",
      header: isAr ? "الكيان" : "Entity",
      cell: ({ row }) => (
        <div className="text-xs">
          <div className="font-medium">{row.original.entity_type}</div>
          <div className="text-muted-foreground truncate max-w-[150px]">
            {row.original.entity_id}
          </div>
        </div>
      ),
      size: 200,
    },
    {
      id: "status",
      header: isAr ? "الحالة" : "Status",
      cell: () => (
        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
          {isAr ? "نجح" : "Success"}
        </Badge>
      ),
      size: 100,
    },
  ], [isAr]);

  const filteredLogs = useMemo(() => {
    if (!data?.data) return [];
    
    let logs = data.data;

    if (userFilter) {
      logs = logs.filter((log: AuditLog) => 
        log.actor_sub.toLowerCase().includes(userFilter.toLowerCase())
      );
    }

    if (actionFilter !== "all") {
      logs = logs.filter((log: AuditLog) => 
        log.action.toLowerCase().includes(actionFilter.toLowerCase())
      );
    }

    const now = Date.now();
    const ranges: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "all": Infinity,
    };
    
    const rangeMs = ranges[dateRange] || Infinity;
    logs = logs.filter((log: AuditLog) => 
      now - new Date(log.occurred_at).getTime() < rangeMs
    );

    return logs;
  }, [data?.data, userFilter, actionFilter, dateRange]);

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    if (typeof window === "undefined") return;

    const headers = ["Timestamp", "User", "Action", "Entity Type", "Entity ID", "IP Address"];
    
    const rows = filteredLogs.map((log: AuditLog) => [
      new Date(log.occurred_at).toISOString(),
      log.actor_sub,
      log.action,
      log.entity_type,
      log.entity_id,
      log.ip_address,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            {isAr ? "سجلات المراجعة" : "Audit Logs"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isAr ? "نطاق التاريخ" : "Date range"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">{isAr ? "آخر 24 ساعة" : "Last 24 hours"}</SelectItem>
                <SelectItem value="7d">{isAr ? "آخر 7 أيام" : "Last 7 days"}</SelectItem>
                <SelectItem value="30d">{isAr ? "آخر 30 يوم" : "Last 30 days"}</SelectItem>
                <SelectItem value="all">{isAr ? "كل الوقت" : "All time"}</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder={isAr ? "تصفية حسب المستخدم..." : "Filter by user..."}
              value={userFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserFilter(e.target.value)}
              className="max-w-xs"
            />

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isAr ? "نوع الإجراء" : "Action type"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "كل الإجراءات" : "All actions"}</SelectItem>
                <SelectItem value="login">{isAr ? "تسجيل دخول" : "Login"}</SelectItem>
                <SelectItem value="create">{isAr ? "إنشاء" : "Create"}</SelectItem>
                <SelectItem value="update">{isAr ? "تحديث" : "Update"}</SelectItem>
                <SelectItem value="delete">{isAr ? "حذف" : "Delete"}</SelectItem>
                <SelectItem value="export">{isAr ? "تصدير" : "Export"}</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV}
                disabled={!filteredLogs.length}
              >
                <Download className="h-4 w-4 mr-2" />
                {isAr ? "تصدير CSV" : "Export CSV"}
              </Button>
            </div>
          </div>

          <DataTable 
            columns={columns} 
            data={filteredLogs} 
            isLoading={isLoading}
            emptyState={
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {isAr ? "لا توجد سجلات مراجعة" : "No audit logs found"}
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
