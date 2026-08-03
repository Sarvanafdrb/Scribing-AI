"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/session.queries";
import { useEncounterUiStore } from "@/store/encounter-ui.store";
import {
  canStartNextRoundToday,
  getEncounterType,
} from "@/utils/encounter.utils";
import type { DispositionType } from "@/types/encounter.types";
import type { Session } from "@/types/session.types";

interface SaveConsultationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  sessionId: string;
}

type OpAction = DispositionType;
type IpAction = "finish" | "next_round";

export function SaveConsultationDialog({
  open,
  onOpenChange,
  session,
  sessionId,
}: SaveConsultationDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAdmitOpen = useEncounterUiStore((s) => s.setAdmitModalOpen);
  const isIp = getEncounterType(session) === "IP";
  const hasNextRound = canStartNextRoundToday(session);
  const scheduleKnown = (session.todaySchedule?.length || 0) > 0;
  const allDone =
    isIp &&
    scheduleKnown &&
    (Boolean(session.allRoundsCompletedToday) || !hasNextRound);

  const [opAction, setOpAction] = useState<OpAction>("home");
  const [ipAction, setIpAction] = useState<IpAction>("finish");
  const [followUpDate, setFollowUpDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setOpAction("home");
    setIpAction(hasNextRound ? "next_round" : "finish");
    setFollowUpDate("");
  }, [open, hasNextRound]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) }),
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() }),
    ]);
  };

  const dispositionMutation = useMutation({
    mutationFn: () =>
      encounterService.setDisposition(sessionId, opAction, {
        followUpDate: opAction === "follow_up" ? followUpDate || undefined : undefined,
      }),
    onSuccess: async () => {
      await invalidate();
      onOpenChange(false);
      if (opAction === "home") {
        toast.success("Visit completed — patient sent home");
      } else if (opAction === "follow_up") {
        toast.success("Follow-up disposition saved");
      }
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Failed to save disposition");
    },
  });

  const nextRound = useMutation({
    mutationFn: () => {
      const nextSchedule = session.todaySchedule?.find(
        (r) => r.status === "pending",
      );
      return encounterService.createNextRound(sessionId, {
        roundScheduleId: nextSchedule?.id,
        roundType: nextSchedule?.roundType as
          | "morning"
          | "afternoon"
          | "night"
          | undefined,
      });
    },
    onSuccess: async (data) => {
      const nextId = data.session?._id || data.session?.id;
      await invalidate();
      onOpenChange(false);
      if (nextId) {
        router.push(`/doctor/workspace/${nextId}`);
      }
      toast.success("Next round ready — recording reset");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Failed to start next round");
    },
  });

  const handleConfirm = () => {
    if (!isIp) {
      if (opAction === "admit") {
        onOpenChange(false);
        setAdmitOpen(true);
        return;
      }
      dispositionMutation.mutate();
      return;
    }

    if (ipAction === "next_round" && hasNextRound) {
      nextRound.mutate();
      return;
    }
    onOpenChange(false);
  };

  const isPending = dispositionMutation.isPending || nextRound.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isIp ? "Round Saved Successfully" : "Consultation Saved Successfully"}
          </DialogTitle>
          <DialogDescription>
            {isIp && allDone
              ? "All rounds for today are completed."
              : "Next Action"}
          </DialogDescription>
        </DialogHeader>

        {!isIp && (
          <div className="space-y-2 py-2">
            {(
              [
                { value: "home" as const, label: "Home" },
                { value: "follow_up" as const, label: "Follow-up" },
                { value: "admit" as const, label: "Admit as Inpatient" },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="op-disposition"
                  checked={opAction === option.value}
                  onChange={() => setOpAction(option.value)}
                  className="accent-teal-600"
                />
                {option.label}
              </label>
            ))}

            {opAction === "follow_up" && (
              <label className="mt-2 block space-y-1 px-1">
                <span className="text-xs font-medium text-gray-500">
                  Follow-up date (optional)
                </span>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
                />
              </label>
            )}
          </div>
        )}

        {isIp && (
          <div className="space-y-2 py-2">
            {allDone ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                ✔ All rounds for today are completed. The patient remains
                admitted and will appear in tomorrow&apos;s queue.
              </p>
            ) : (
              <>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50">
                  <input
                    type="radio"
                    name="ip-next-action"
                    checked={ipAction === "finish"}
                    onChange={() => setIpAction("finish")}
                    className="accent-teal-600"
                  />
                  Finish Round
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50">
                  <input
                    type="radio"
                    name="ip-next-action"
                    checked={ipAction === "next_round"}
                    onChange={() => setIpAction("next_round")}
                    className="accent-teal-600"
                  />
                  Start Next Round
                </label>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
