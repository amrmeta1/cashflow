import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AIAdvisorLoading() {
  return (
    <div className="min-h-full w-full" data-page-content>
      <div className="max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Daily Brief Skeleton */}
        <Card className="border-s-4 border-s-indigo-500 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <Skeleton className="h-6 w-48" />
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Forecast Snapshot Skeleton */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-3 pt-5 px-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Cases Skeleton */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-3 pt-5 px-5">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border/50">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Treasury Chat Skeleton */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
