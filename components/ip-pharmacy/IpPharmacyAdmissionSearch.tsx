"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccessControl } from "@/hooks/useAccessControl";
import {
  ipPharmacyEncounterSearchQuery,
} from "@/services/ip-medicine-billing.queries";

const statusLabel = (status: string) => {
  if (status === "discharged") return "Discharged (read-only)";
  if (status === "admitted") return "Admitted";
  return status;
};

export function IpPharmacyAdmissionSearch() {
  const { canViewIpMedicineBillingSummary } = useAccessControl();
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(input.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [input]);

  const enabled = canViewIpMedicineBillingSummary();
  const searchQuery = useQuery(
    ipPharmacyEncounterSearchQuery(debounced, page, enabled),
  );

  const items = searchQuery.data?.items ?? [];
  const pagination = searchQuery.data?.pagination;

  return (
    <div className="space-y-4">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by patient name, patient code, admission ID, or encounter code…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Search IP admissions for pharmacy"
        />
      </div>

      {searchQuery.isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : searchQuery.isError ? (
        <p className="text-sm text-destructive">
          Could not load admissions. Check your pharmacy permissions and try
          again.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-1 px-1">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Admission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ward / bed</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length ? (
                  items.map((row) => (
                    <TableRow key={row.encounterId}>
                      <TableCell>
                        <div className="font-medium">
                          {row.patientName?.trim() || "—"}
                        </div>
                        {row.patientCode ? (
                          <div className="text-xs text-muted-foreground">
                            {row.patientCode}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{row.encounterId}</div>
                        {row.encounterCode ? (
                          <div className="text-xs text-muted-foreground">
                            {row.encounterCode}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === "discharged" ? "outline" : "secondary"
                          }
                        >
                          {statusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {[row.ward, row.bed].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" asChild>
                          <Link
                            href={`/ip-pharmacy/encounters/${row.encounterId}`}
                          >
                            Open pharmacy
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {debounced
                        ? "No matching inpatient admissions."
                        : "No inpatient admissions found. Try searching by patient or admission ID."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} admission
                {pagination.total === 1 ? "" : "s"})
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
