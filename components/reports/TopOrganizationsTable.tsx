"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TopOrganizationReport } from "@/types/report.types";

interface TopOrganizationsTableProps {
  data?: TopOrganizationReport[];
  isLoading?: boolean;
}

export function TopOrganizationsTable({
  data = [],
  isLoading = false,
}: TopOrganizationsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Organizations By Usage</CardTitle>
        <p className="mt-1 text-sm text-gray-500">
          Ranked by completed consultation sessions
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
            No Data Available
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Organization Name</TableHead>
                  <TableHead className="text-right">
                    Total Consultations
                  </TableHead>
                  <TableHead className="text-right">
                    Total Transcripts
                  </TableHead>
                  <TableHead className="text-right">Total AI Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((org, index) => (
                  <TableRow key={`${org.organizationName}-${index}`}>
                    <TableCell className="font-medium text-gray-500">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {org.organizationName}
                    </TableCell>
                    <TableCell className="text-right">{org.sessions}</TableCell>
                    <TableCell className="text-right">
                      {org.transcripts}
                    </TableCell>
                    <TableCell className="text-right">{org.aiNotes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
