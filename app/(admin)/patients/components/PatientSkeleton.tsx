"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { healthcareSolid } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

export function PatientSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className={cn("space-y-3 p-4", healthcareSolid.card)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
