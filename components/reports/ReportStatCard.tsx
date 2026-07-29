"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface ReportStatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  isLoading?: boolean;
  empty?: boolean;
  accentClassName?: string;
}

export function ReportStatCard({
  title,
  value,
  icon: Icon,
  isLoading = false,
  empty = false,
  accentClassName = "bg-blue-600",
}: ReportStatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${accentClassName}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : empty ? (
          <p className="text-sm text-gray-500">No Data Available</p>
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
