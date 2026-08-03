"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/hooks/sessions/useSession";
import { useAuthStore } from "@/store/auth.store";
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/session.queries";
import { api } from "@/services/api";

interface AdmitPatientModalProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdmitPatientModal({
  sessionId,
  open,
  onOpenChange,
}: AdmitPatientModalProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession(sessionId);
  const { user } = useAuthStore();
  const organizationId =
    typeof session?.organizationId === "object"
      ? session?.organizationId?._id || session?.organizationId?.id
      : session?.organizationId;

  const [ward, setWard] = useState("");
  const [bed, setBed] = useState("");
  const [reason, setReason] = useState("");
  const [attendingDoctorId, setAttendingDoctorId] = useState("");
  const [admittedAt, setAdmittedAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );

  const doctorsQuery = useQuery({
    queryKey: ["doctors-for-admit", organizationId],
    enabled: open && Boolean(organizationId),
    queryFn: async () => {
      const response = await api.get("/users", {
        params: {
          organizationId,
          isActive: true,
          limit: 100,
          page: 1,
        },
      });
      return (response.data.data || []) as Array<{
        _id?: string;
        id?: string;
        firstName?: string;
        lastName?: string;
      }>;
    },
  });

  useEffect(() => {
    if (!open) {
      // Safety: never leave the page click-blocked after admit/cancel.
      document.body.style.removeProperty("pointer-events");
      document.body.style.removeProperty("overflow");
      return;
    }
    const defaultDoctor =
      (typeof session?.userId === "object"
        ? session.userId._id || session.userId.id
        : session?.userId) || user?.id;
    if (defaultDoctor) setAttendingDoctorId(String(defaultDoctor));
  }, [open, session?.userId, user?.id]);

  const admitMutation = useMutation({
    mutationFn: () =>
      encounterService.admitPatient(sessionId, {
        ward: ward.trim(),
        bed: bed.trim(),
        reason: reason.trim() || undefined,
        attendingDoctorId,
        admittedAt: admittedAt
          ? new Date(admittedAt).toISOString()
          : undefined,
      }),
    onSuccess: async () => {
      // Close dialog BEFORE refetch flips encounter to IP. Otherwise the parent
      // can unmount this modal while open and leave a stuck overlay that blocks
      // Save / Preview / Voice Edit clicks.
      onOpenChange(false);
      setWard("");
      setBed("");
      setReason("");

      // Let Radix finish unmounting the portal, then refresh session data.
      await new Promise((resolve) => window.setTimeout(resolve, 50));

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: sessionKeys.detail(sessionId),
        }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.lists() }),
      ]);
      toast.success("Patient admitted — encounter is now IP");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Failed to admit patient");
    },
  });

  const canSubmit =
    ward.trim() && bed.trim() && attendingDoctorId && !admitMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Admit Patient</DialogTitle>
          <DialogDescription>
            Convert this encounter from OP to IP and capture admission details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Field label="Ward">
            <input
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="e.g. A12"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </Field>
          <Field label="Bed">
            <input
              value={bed}
              onChange={(e) => setBed(e.target.value)}
              placeholder="e.g. 08"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </Field>
          <Field label="Admission Reason">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Optional"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </Field>
          <Field label="Attending Doctor">
            <select
              value={attendingDoctorId}
              onChange={(e) => setAttendingDoctorId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            >
              <option value="">Select doctor</option>
              {(doctorsQuery.data || []).map((doctor) => {
                const id = doctor._id || doctor.id || "";
                return (
                  <option key={id} value={id}>
                    Dr. {doctor.firstName} {doctor.lastName}
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="Admission Date">
            <input
              type="datetime-local"
              value={admittedAt}
              onChange={(e) => setAdmittedAt(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </Field>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => admitMutation.mutate()}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {admitMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Admit
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}
