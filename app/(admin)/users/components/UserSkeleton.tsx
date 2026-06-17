import { Skeleton } from "@/components/ui/skeleton";

export function UserSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-md border divide-y">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}
