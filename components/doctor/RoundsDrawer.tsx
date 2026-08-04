"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Circle, Loader2, Plus, Play } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSession } from "@/hooks/sessions/useSession";
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/session.queries";
import { getEncounterType } from "@/utils/encounter.utils";
import type { RoundSchedule } from "@/types/encounter.types";
import { cn } from "@/lib/utils";

interface RoundsDrawerProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoundsDrawer({
  sessionId,
  open,
  onOpenChange,
}: RoundsDrawerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession(sessionId);
  const isIp = getEncounterType(session) === "IP";

  const schedule: RoundSchedule[] =
    session?.todaySchedule && session.todaySchedule.length > 0
      ? session.todaySchedule
      : [];

  const hasPending = schedule.some((r) => r.status === "pending");
  const allDone =
    schedule.length > 0 && schedule.every((r) => r.status === "completed");

  const openRound = useMutation({
    mutationFn: async (round: RoundSchedule) => {
      if (round.consultationId) {
        return { sessionId: round.consultationId };
      }
      const data = await encounterService.createNextRound(sessionId, {
        roundScheduleId: round.id,
        roundType: round.roundType as "morning" | "afternoon" | "night",
      });
      return {
        sessionId: String(data.session?._id || data.session?.id || ""),
      };
    },
    onSuccess: async ({ sessionId: nextId }) => {
      await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      onOpenChange(false);
      if (nextId && nextId !== sessionId) {
        router.push(`/doctor/workspace/${nextId}`);
      }
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Failed to open round");
    },
  });

  const addNextRound = useMutation({
    mutationFn: () => {
      const next = schedule.find((r) => r.status === "pending");
      return encounterService.createNextRound(sessionId, {
        roundScheduleId: next?.id,
        roundType: next?.roundType as "morning" | "afternoon" | "night" | undefined,
      });
    },
    onSuccess: async (data) => {
      const nextId = data.session?._id || data.session?.id;
      await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      onOpenChange(false);
      if (nextId) {
        router.push(`/doctor/workspace/${nextId}`);
      }
      toast.success("New round started");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Failed to create round");
    },
  });

  const statusLabel = (round: RoundSchedule) => {
    if (round.status === "completed") return "Completed";
    if (round.status === "in_progress" || round.isCurrent) return "In Progress";
    if (round.status === "skipped") return "Skipped";
    if (round.status === "missed") return "Missed";
    if (round.status === "cancelled") return "Cancelled";
    return "Pending";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Today&apos;s Rounds</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2 px-1">
          {!isIp && (
            <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500">
              Rounds are available after the patient is admitted (IP).
            </p>
          )}

          {isIp && schedule.length === 0 && (
            <p className="text-sm text-gray-500">
              No round schedule for today yet.
            </p>
          )}

          {schedule.map((round) => {
            const isActive =
              round.isCurrent ||
              round.consultationId === sessionId ||
              round.status === "in_progress";

            return (
              <button
                key={round.id}
                type="button"
                disabled={openRound.isPending}
                onClick={() => openRound.mutate(round)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                  isActive
                    ? "border-teal-200 bg-teal-50"
                    : "border-gray-200 bg-white hover:bg-gray-50",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                  {round.status === "completed" ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : isActive ? (
                    <Play className="h-4 w-4 text-teal-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">
                    {round.roundName}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {statusLabel(round)}
                  </span>
                </span>
              </button>
            );
          })}

          {isIp && allDone && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              ✔ All rounds for today are completed.
            </p>
          )}

          {isIp && hasPending && (
            <button
              type="button"
              onClick={() => addNextRound.mutate()}
              disabled={addNextRound.isPending}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 px-3 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              {addNextRound.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add New Round
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
