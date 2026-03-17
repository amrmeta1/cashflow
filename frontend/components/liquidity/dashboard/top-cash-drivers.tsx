"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTopVendors } from "@/lib/api/cashflow-dna-api";
import type { VendorStats } from "@/lib/api/cashflow-dna-api";
import { Skeleton } from "@/components/shared/ui/skeleton";

interface TopCashDriversProps {
  tenantId?: string;
  currency: string;
  isAr: boolean;
}

function formatAmount(amount: number): string {
  const absAmount = Math.abs(amount);
  if (absAmount >= 1_000_000) {
    return `${(absAmount / 1_000_000).toFixed(1)}M`;
  }
  if (absAmount >= 1_000) {
    return `${Math.round(absAmount / 1_000)}k`;
  }
  return absAmount.toFixed(0);
}

export function TopCashDrivers({ tenantId, currency, isAr }: TopCashDriversProps) {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorStats[]>([]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const fetchVendors = async () => {
      try {
        const data = await getTopVendors(tenantId, 5);
        setVendors(data.vendors || []);
      } catch (error) {
        console.warn("Failed to fetch top vendors:", error);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [tenantId]);

  const maxOutflow = vendors.length > 0 ? Math.max(...vendors.map((v) => v.total_outflow)) : 0;

  if (loading) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (vendors.length === 0) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              {isAr ? "أكبر محركات النقد" : "Top Cash Drivers"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="text-sm text-muted-foreground">
            {isAr ? "لا توجد بيانات متاحة" : "No data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">
            {isAr ? "أكبر محركات النقد" : "Top Cash Drivers"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-3">
        {vendors.map((vendor, index) => {
          const percentage = maxOutflow > 0 ? (vendor.total_outflow / maxOutflow) * 100 : 0;
          const barColor =
            index === 0
              ? "bg-rose-500"
              : index === 1
              ? "bg-rose-400"
              : index === 2
              ? "bg-amber-500"
              : "bg-indigo-400";

          return (
            <div key={vendor.vendor_id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate flex-1 min-w-0">
                  {vendor.vendor_name || (isAr ? "غير معروف" : "Unknown")}
                </span>
                <span className="text-sm font-bold tabular-nums text-muted-foreground shrink-0 ms-2">
                  {currency} {formatAmount(vendor.total_outflow)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", barColor)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
