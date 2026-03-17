"use client";

import { useQuery } from "@tanstack/react-query";
import { Server, Clock, Database } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { getSystemStatus } from "@/lib/api/enterprise-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shared/ui/table";
import { Skeleton } from "@/components/shared/ui/skeleton";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string, isAr: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
  if (minutes > 0) return isAr ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  return isAr ? "الآن" : "just now";
}

function formatDateTime(iso: string, isAr: boolean): string {
  const date = new Date(iso);
  return date.toLocaleString(isAr ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SystemStatusPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  const { data, isLoading } = useQuery({
    queryKey: ["system-status"],
    queryFn: getSystemStatus,
    refetchInterval: 30000,
  });

  const status = data?.data;

  return (
    <div className="space-y-6">
      {/* Section 1: Core Services */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              {isAr ? "الخدمات الأساسية" : "Core Services"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? "الخدمة" : "Service"}</TableHead>
                <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isAr ? "وقت الاستجابة" : "Response Time"}</TableHead>
                <TableHead>{isAr ? "آخر فحص" : "Last Check"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : (
                status?.services.map((service: any) => (
                  <TableRow key={service.name}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          service.status === "operational" ? "default" :
                          service.status === "degraded" ? "secondary" : "destructive"
                        }
                        className={cn(
                          "text-xs",
                          service.status === "operational" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : service.status === "degraded"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            service.status === "operational" && "bg-emerald-500",
                            service.status === "degraded" && "bg-amber-500",
                            service.status === "down" && "bg-rose-500"
                          )} />
                          {service.status === "operational" 
                            ? (isAr ? "تعمل" : "Operational")
                            : service.status === "degraded"
                            ? (isAr ? "متدهورة" : "Degraded")
                            : (isAr ? "متوقفة" : "Down")
                          }
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {service.response_time_ms}ms
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(service.last_check, isAr)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 2: Uptime */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              {isAr ? "وقت التشغيل" : "Uptime"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">
                  {isAr ? "نسبة وقت التشغيل (آخر 30 يوم)" : "Uptime (Last 30 Days)"}
                </dt>
                <dd className="text-2xl font-bold tabular-nums tracking-tight mt-1">
                  {status?.uptime_percentage.toFixed(2)}%
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {isAr ? "أيام التشغيل المستمر" : "Continuous Uptime"}
                </dt>
                <dd className="text-2xl font-bold tabular-nums tracking-tight mt-1">
                  {status?.uptime_days} {isAr ? "يوم" : "days"}
                </dd>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Backup Status */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              {isAr ? "حالة النسخ الاحتياطي" : "Backup Status"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted-foreground">
                  {isAr ? "آخر نسخة احتياطية" : "Last Backup"}
                </dt>
                <dd className="text-sm font-medium mt-1">
                  {formatDateTime(status?.last_backup.timestamp || "", isAr)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {isAr ? "الحالة" : "Status"}
                </dt>
                <dd className="mt-1">
                  <Badge
                    variant={
                      status?.last_backup.status === "success" ? "default" :
                      status?.last_backup.status === "in_progress" ? "secondary" : "destructive"
                    }
                    className={cn(
                      "text-xs",
                      status?.last_backup.status === "success"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : status?.last_backup.status === "in_progress"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    )}
                  >
                    {status?.last_backup.status === "success"
                      ? (isAr ? "نجح" : "Success")
                      : status?.last_backup.status === "in_progress"
                      ? (isAr ? "قيد التنفيذ" : "In Progress")
                      : (isAr ? "فشل" : "Failed")
                    }
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {isAr ? "الحجم" : "Size"}
                </dt>
                <dd className="text-sm font-medium mt-1">
                  {status?.last_backup.size_mb.toFixed(2)} MB
                </dd>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
