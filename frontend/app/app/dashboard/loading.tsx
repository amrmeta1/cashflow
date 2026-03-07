import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SkeletonKpiCard, SkeletonChart } from "@/components/ui/skeleton-card";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col xl:flex-row gap-5 p-5 md:p-6 overflow-y-auto h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {/* Welcome Banner */}
        <div className="rounded-2xl border border-border/50 p-5 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>

        {/* Date Filter */}
        <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonKpiCard key={i} />
          ))}
        </div>

        {/* Main Chart */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <SkeletonChart height="h-[430px]" />
          </CardContent>
        </Card>

        {/* Cash Evolution Chart */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <SkeletonChart height="h-[340px]" />
          </CardContent>
        </Card>

        {/* 7-Day Forecast */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[180px] w-full" />
          </CardContent>
        </Card>

        {/* Middle Row: 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-sm border-border/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar */}
      <div className="w-full xl:w-80 shrink-0">
        <div className="space-y-5">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
