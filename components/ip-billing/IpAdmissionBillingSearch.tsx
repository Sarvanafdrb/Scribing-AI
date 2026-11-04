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
import { ipAdmissionBillingService } from "@/services/ip-admission-billing.service";
import { ipAdmissionBillingKeys } from "@/services/ip-admission-billing.queries";

export function IpAdmissionBillingSearch() {
  const { canViewIpAdmissionBilling } = useAccessControl();
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

  const searchQuery = useQuery({
    queryKey: ipAdmissionBillingKeys.search(debounced, page),
    queryFn: () =>
      ipAdmissionBillingService.searchAdmissions({
        search: debounced || undefined,
        page,
        limit: 20,
      }),
    enabled: canViewIpAdmissionBilling(),
  });

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
          aria-label="Search IP admissions"
        />
      </div>

      {searchQuery.isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : searchQuery.isError ? (
        <p className="text-sm text-destructive">
          Could not load admissions. Try again or open a known encounter link.
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
                      <Badge variant="secondary">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {[row.ward, row.bed].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" asChild>
                        <Link
                          href={`/ip-billing/encounters/${row.encounterId}`}
                        >
                          Open billing
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {debounced
                      ? "No matching IP admissions in your organization."
                      : "No IP admissions in your organization yet."}
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
                {pagination.total} admissions)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
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
