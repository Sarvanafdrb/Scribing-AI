"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TranscriptionStatusReport } from "@/types/report.types";

interface TranscriptionStatusChartProps {
  data?: TranscriptionStatusReport;
  isLoading?: boolean;
}

const COLORS = {
  success: "#16a34a",
  failed: "#dc2626",
  processing: "#2563eb",
  pending: "#9ca3af",
};

export function TranscriptionStatusChart({
  data,
  isLoading = false,
}: TranscriptionStatusChartProps) {
  const chartData = [
    { name: "Successful", value: data?.success ?? 0, key: "success" as const },
    { name: "Failed", value: data?.failed ?? 0, key: "failed" as const },
    {
      name: "Processing",
      value: data?.processing ?? 0,
      key: "processing" as const,
    },
    { name: "Pending", value: data?.pending ?? 0, key: "pending" as const },
  ];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Success vs Failed Transcriptions</CardTitle>
        <p className="mt-1 text-sm text-gray-500">
          Breakdown by transcript processing status
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="mx-auto h-72 w-full max-w-sm rounded-full" />
        ) : total === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
            No Data Available
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
