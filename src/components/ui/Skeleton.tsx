import { cn } from "@/lib/utils/cn";

interface SkeletonProps { className?: string; }

export default function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-4 px-4 py-3 border-b border-border">
      {Array.from({ length: cols }, (_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}
