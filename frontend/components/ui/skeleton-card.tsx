import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  showHeader?: boolean;
  headerHeight?: string;
  contentHeight?: string;
  rows?: number;
}

export function SkeletonCard({
  className,
  headerClassName,
  contentClassName,
  showHeader = true,
  headerHeight = "h-6",
  contentHeight = "h-20",
  rows = 1,
}: SkeletonCardProps) {
  return (
    <Card className={cn("shadow-sm border-border/50", className)}>
      {showHeader && (
        <CardHeader className={cn("pb-2", headerClassName)}>
          <Skeleton className={cn(headerHeight, "w-40")} />
        </CardHeader>
      )}
      <CardContent className={cn("space-y-3", contentClassName)}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={cn(contentHeight, "w-full")} />
        ))}
      </CardContent>
    </Card>
  );
}

export function SkeletonKpiCard() {
  return (
    <Card className="shadow-sm border-border/50">
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </CardContent>
    </Card>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className={cn("grid gap-4 p-4 border-b", `grid-cols-${columns}`)}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className={cn("grid gap-4 p-4", `grid-cols-${columns}`)}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = "h-[300px]" }: { height?: string }) {
  return <Skeleton className={cn(height, "w-full rounded-lg")} />;
}
