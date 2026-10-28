"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { appointmentService } from "@/services/appointment.service";
import { useAppointmentMutations } from "@/hooks/appointments/useAppointmentMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import {
  AppointmentSlotPicker,
  type SelectedSlot,
} from "./AppointmentSlotPicker";
import type { RescheduleAppointmentData } from "@/types/appointment.types";
import {
  APPOINTMENT_FREE_RESCHEDULE_LIMIT,
  isAtRescheduleLimit,
} from "@/constants/appointment.constants";
import { RescheduleLimitNotice } from "./RescheduleLimitNotice";
import { cn } from "@/lib/utils";

const getDoctorOptionId = (doc: { id?: string; _id?: string }) =>
  String(doc.id || doc._id || "");

const tomorrowDateKey = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type AuditMeta = {
  rescheduleCount?: number;
  requiresApprovalForNextReschedule?: boolean;
  pendingRescheduleApproval?: {
    _id?: string;
    id?: string;
    status?: string;
    appointmentDate?: string;
    startTime?: string;
    endTime?: string;
    createdAt?: string;
  } | null;
  events?: Array<{
    eventType?: string;
    createdAt?: string;
    reason?: string;
  }>;
};

interface RescheduleAppointmentPanelProps {
  appointmentId: string;
  organizationId: string;
  initialDoctorId: string;
  defaultDurationMinutes: number;
  auditMeta?: AuditMeta;
  onRescheduled: (newAppointmentId: string) => void;
}

export function RescheduleAppointmentPanel(props: RescheduleAppointmentPanelProps) {
  const pendingRequest = props.auditMeta?.pendingRescheduleApproval;
  const pendingRequestId = String(
    pendingRequest?._id || pendingRequest?.id || "",
  );
  const atLimit = isAtRescheduleLimit(props.auditMeta?.rescheduleCount);

  if (atLimit && !pendingRequestId) {
    return (
      <div className="rounded-2xl border border-border/60 p-4">
        <RescheduleLimitNotice />
      </div>
    );
  }

  return <RescheduleAppointmentPanelForm {...props} />;
}

function RescheduleAppointmentPanelForm({
  appointmentId,
  organizationId,
  initialDoctorId,
  defaultDurationMinutes,
  auditMeta,
  onRescheduled,
}: RescheduleAppointmentPanelProps) {
  const queryClient = useQueryClient();
  const { canReviewRescheduleApprovals } = useAccessControl();
  const { rescheduleAppointment, reviewRescheduleApproval } =
    useAppointmentMutations();

  const [appointmentDate, setAppointmentDate] = useState(tomorrowDateKey());
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const pendingRequest = auditMeta?.pendingRescheduleApproval;
  const pendingRequestId = String(
    pendingRequest?._id || pendingRequest?.id || "",
  );

  const { data: availableDoctorsData, isLoading: loadingDoctors } = useQuery({
    queryKey: [
      "appointment-doctors",
      organizationId,
      appointmentDate,
      "reschedule",
    ],
    queryFn: () =>
      appointmentService.getAvailableDoctors(organizationId, appointmentDate),
    enabled: Boolean(organizationId && appointmentDate),
  });

  const doctorsForSelect = useMemo(
    () => availableDoctorsData?.doctors ?? [],
    [availableDoctorsData?.doctors],
  );

  const doctorIdsKey = useMemo(
    () => doctorsForSelect.map(getDoctorOptionId).join(","),
    [doctorsForSelect],
  );

  const doctorIdInList = (id: string) =>
    Boolean(id) && doctorsForSelect.some((d) => getDoctorOptionId(d) === id);

  const activeDoctorId = useMemo(() => {
    if (doctorId && doctorIdInList(doctorId)) return doctorId;
    if (initialDoctorId && doctorIdInList(initialDoctorId)) {
      return initialDoctorId;
    }
    const first = doctorsForSelect[0];
    return first ? getDoctorOptionId(first) : "";
  }, [doctorId, initialDoctorId, doctorIdsKey, doctorsForSelect]);

  const buildPayload = (): RescheduleAppointmentData | null => {
    if (!appointmentDate || !selectedSlot) return null;
    return {
      appointmentDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      durationMinutes: defaultDurationMinutes,
      reason: reason.trim() || undefined,
    };
  };

  const invalidateAudit = () => {
    queryClient.invalidateQueries({
      queryKey: ["appointment-audit", appointmentId],
    });
  };

  const extractMessage = (error: unknown) =>
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    (error as Error)?.message ||
    "Request failed";

  const handleOpenConfirm = () => {
    setSubmitError("");
    if (!selectedSlot) {
      setSubmitError("Select an available time slot.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setPending(true);
    setSubmitError("");
    try {
      const updated = await rescheduleAppointment.mutateAsync({
        id: appointmentId,
        data: payload,
      });
      setConfirmOpen(false);
      const newId = String(updated.id || updated._id || "");
      if (newId) onRescheduled(newId);
    } catch (error: unknown) {
      setSubmitError(extractMessage(error));
      setConfirmOpen(false);
    } finally {
      setPending(false);
    }
  };

  const handleReview = async (decision: "approved" | "rejected") => {
    if (!pendingRequestId) return;
    if (decision === "rejected" && !reviewNote.trim()) {
      setSubmitError("Rejection reason is required.");
      return;
    }
    setPending(true);
    setSubmitError("");
    try {
      const result = await reviewRescheduleApproval.mutateAsync({
        requestId: pendingRequestId,
        decision,
        reviewNote: reviewNote.trim() || undefined,
      });
      setReviewNote("");
      invalidateAudit();
      if (decision === "approved" && result?.appointment) {
        const newId = String(
          result.appointment.id || result.appointment._id || "",
        );
        if (newId) onRescheduled(newId);
      }
    } catch (error: unknown) {
      setSubmitError(extractMessage(error));
    } finally {
      setPending(false);
    }
  };

  const approvalHistory = (auditMeta?.events || []).filter((e) =>
    [
      "RESCHEDULE_APPROVAL_REQUESTED",
      "RESCHEDULE_APPROVED",
      "RESCHEDULE_REJECTED",
    ].includes(String(e.eventType)),
  );

  const canReview =
    canReviewRescheduleApprovals() && Boolean(pendingRequestId);

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 p-4">
      <div>
        <p className="font-medium">Reschedule appointment</p>
        {auditMeta?.rescheduleCount !== undefined ? (
          <p className="text-sm text-muted-foreground">
            Reschedules used: {auditMeta.rescheduleCount} of{" "}
            {APPOINTMENT_FREE_RESCHEDULE_LIMIT}
          </p>
        ) : null}
      </div>

      {pendingRequestId ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-medium">Pending reschedule approval</p>
          <p className="mt-1 text-muted-foreground">
            Requested slot: {pendingRequest?.appointmentDate}{" "}
            {pendingRequest?.startTime}
            {pendingRequest?.endTime ? ` – ${pendingRequest.endTime}` : ""}
          </p>
          {pendingRequest?.createdAt ? (
            <p className="text-xs text-muted-foreground">
              Submitted {new Date(pendingRequest.createdAt).toLocaleString()}
            </p>
          ) : null}
          {canReview ? (
            <div className="mt-3 space-y-2">
              <Label htmlFor="review-note">
                Review note (required to reject)
              </Label>
              <Textarea
                id="review-note"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Note for staff…"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-blue-600 hover:bg-blue-700"
                  disabled={pending}
                  onClick={() => void handleReview("approved")}
                >
                  Approve & reschedule
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={pending}
                  onClick={() => void handleReview("rejected")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">
              An administrator will review this request. You cannot submit another
              request until it is resolved.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>New date</Label>
              <Input
                type="date"
                value={appointmentDate}
                min={tomorrowDateKey()}
                onChange={(e) => {
                  setAppointmentDate(e.target.value);
                  setSelectedSlot(null);
                  setDoctorId(initialDoctorId);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-doctor">Doctor</Label>
              {loadingDoctors ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading doctors…
                </div>
              ) : doctorsForSelect.length > 0 && activeDoctorId ? (
                <select
                  id="reschedule-doctor"
                  className={cn(
                    "flex h-10 w-full rounded-full border border-border bg-white/85 px-3.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 dark:bg-white/10",
                  )}
                  value={activeDoctorId}
                  onChange={(e) => {
                    setDoctorId(e.target.value);
                    setSelectedSlot(null);
                  }}
                >
                  {doctorsForSelect.map((doc) => {
                    const docId = getDoctorOptionId(doc);
                    return (
                      <option key={docId} value={docId}>
                        {[doc.firstName, doc.lastName].filter(Boolean).join(" ") ||
                          doc.email ||
                          "Doctor"}
                      </option>
                    );
                  })}
                </select>
              ) : availableDoctorsData?.configured ? (
                <p className="text-xs text-muted-foreground">
                  No doctors available on this date.
                </p>
              ) : null}
            </div>
          </div>

          {activeDoctorId && appointmentDate ? (
            <AppointmentSlotPicker
              organizationId={organizationId}
              doctorId={activeDoctorId}
              appointmentDate={appointmentDate}
              value={selectedSlot}
              onChange={setSelectedSlot}
            />
          ) : null}

          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {submitError ? (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          ) : null}

          <Button
            type="button"
            className="rounded-full bg-blue-600 hover:bg-blue-700"
            disabled={pending || !selectedSlot || !activeDoctorId}
            onClick={handleOpenConfirm}
          >
            Continue
          </Button>
        </>
      )}

      {approvalHistory.length > 0 ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-sm font-medium">Reschedule approval history</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {approvalHistory.map((event, index) => (
              <li key={`${event.eventType}-${event.createdAt}-${index}`}>
                {event.eventType}
                {event.reason ? ` — ${event.reason}` : ""}
                {event.createdAt
                  ? ` (${new Date(event.createdAt).toLocaleString()})`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!pending) setConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm reschedule</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  The current appointment will be marked rescheduled and a new
                  appointment will be created for the selected slot.
                </p>
                {selectedSlot ? (
                  <p className="font-medium text-foreground">
                    {appointmentDate} · {selectedSlot.startTime} –{" "}
                    {selectedSlot.endTime}
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              className="rounded-full bg-blue-600 hover:bg-blue-700"
              disabled={pending}
              onClick={() => void handleConfirmSubmit()}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working…
                </>
              ) : (
                "Confirm reschedule"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
