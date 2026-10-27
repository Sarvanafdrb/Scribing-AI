"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTenantScope } from "@/hooks/useTenantScope";
import { useAccessControl } from "@/hooks/useAccessControl";
import { appointmentService } from "@/services/appointment.service";
import { useAppointmentMutations } from "@/hooks/appointments/useAppointmentMutations";
import { formatTimeRange } from "../components/AppointmentTable";

type PendingRow = Awaited<
  ReturnType<typeof appointmentService.listRescheduleApprovals>
>[number];

export default function RescheduleApprovalsPage() {
  const { organizationId, organizationName, isAllOrganizations } =
    useTenantScope();
  const { canViewAppointments, canReviewRescheduleApprovals } =
    useAccessControl();
  const queryClient = useQueryClient();
  const { reviewRescheduleApproval } = useAppointmentMutations();

  const [rejectTarget, setRejectTarget] = useState<PendingRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<PendingRow | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [pending, setPending] = useState(false);

  const { data: requests = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["reschedule-approvals", organizationId],
    queryFn: () =>
      appointmentService.listRescheduleApprovals(organizationId!, "pending"),
    enabled:
      Boolean(organizationId) &&
      canViewAppointments() &&
      canReviewRescheduleApprovals(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["reschedule-approvals", organizationId],
    });
  };

  if (!canViewAppointments() || !canReviewRescheduleApprovals()) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to review reschedule approvals.
        </p>
      </div>
    );
  }

  if (!organizationId || isAllOrganizations) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold">Select an organization</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose an organization in the workspace switcher to view pending
          reschedule approvals.
        </p>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!approveTarget) return;
    setPending(true);
    try {
      await reviewRescheduleApproval.mutateAsync({
        requestId: approveTarget.id,
        decision: "approved",
        reviewNote: reviewNote.trim() || undefined,
      });
      setApproveTarget(null);
      setReviewNote("");
      invalidate();
    } finally {
      setPending(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError("Rejection reason is required.");
      return;
    }
    setPending(true);
    setRejectError("");
    try {
      await reviewRescheduleApproval.mutateAsync({
        requestId: rejectTarget.id,
        decision: "rejected",
        reviewNote: trimmed,
      });
      setRejectTarget(null);
      setRejectReason("");
      invalidate();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/appointments">
        <Button variant="ghost" className="rounded-xl pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Appointments
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold">Reschedule approvals</h1>
        <p className="text-muted-foreground">
          Pending requests for {organizationName || "this organization"}. The
          original appointment stays active until approval succeeds.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading pending requests…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 p-6 text-center">
          <p className="text-sm text-destructive">Failed to load requests.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 rounded-full"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      ) : requests.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
          No pending reschedule approval requests.
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map((row) => (
            <li key={row.id}>
              <Card className="glass rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {row.patient?.name || "Patient"}
                  </CardTitle>
                  <CardDescription>
                    {row.patient?.patientCode ? `${row.patient.patientCode} · ` : ""}
                    Doctor: {row.doctor?.name || "—"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Current slot</p>
                      <p className="font-medium">
                        {row.originalScheduledStart
                          ? formatTimeRange(
                              String(row.originalScheduledStart),
                              String(row.originalScheduledEnd || ""),
                            )
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Requested slot</p>
                      <p className="font-medium">
                        {row.appointmentDate} · {row.startTime}
                        {row.endTime ? ` – ${row.endTime}` : ""}
                      </p>
                    </div>
                  </div>
                  {row.reason ? (
                    <div>
                      <p className="text-muted-foreground">Staff reason</p>
                      <p>{row.reason}</p>
                    </div>
                  ) : null}
                  <div className="text-xs text-muted-foreground">
                    Requested by {row.requestedBy?.name || "staff"}
                    {row.createdAt
                      ? ` · ${new Date(row.createdAt).toLocaleString()}`
                      : ""}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full bg-blue-600 hover:bg-blue-700"
                      disabled={pending}
                      onClick={() => {
                        setApproveTarget(row);
                        setReviewNote("");
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={pending}
                      onClick={() => {
                        setRejectTarget(row);
                        setRejectReason("");
                        setRejectError("");
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      asChild
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                    >
                      <Link href={`/appointments/${row.appointmentId}`}>
                        View appointment
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!pending && !open) setApproveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve reschedule?</AlertDialogTitle>
            <AlertDialogDescription>
              The slot will be revalidated. If it is no longer available, the
              appointment will not change and this request stays pending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              className="rounded-full bg-blue-600 hover:bg-blue-700"
              disabled={pending}
              onClick={() => void handleApprove()}
            >
              {pending ? "Approving…" : "Approve"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!pending && !open) setRejectTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject reschedule request</AlertDialogTitle>
            <AlertDialogDescription>
              The original appointment will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Rejection reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            {rejectError ? (
              <p className="text-sm text-destructive">{rejectError}</p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={pending}
              onClick={() => void handleReject()}
            >
              {pending ? "Rejecting…" : "Reject"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
