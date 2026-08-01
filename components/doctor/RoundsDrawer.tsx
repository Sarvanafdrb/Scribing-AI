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
import {
  formatRoundTime,
  getEncounterType,
  nextSuggestedRoundType,
} from "@/utils/encounter.utils";
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

  const rounds = (session?.todayRounds?.length
    ? session.todayRounds
    : session?.rounds?.filter((r) => r.isToday)) || [];

  const createRound = useMutation({
    mutationFn: () =>
      encounterService.createNextRound(sessionId, {
        roundType: nextSuggestedRoundType(),
      }),
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

          {isIp && rounds.length === 0 && (
            <p className="text-sm text-gray-500">No rounds recorded today.</p>
          )}

          {rounds.map((round) => {
            const time =
              formatRoundTime(round.completedAt) ||
              formatRoundTime(round.startedAt) ||
              formatRoundTime(round.createdAt);

            return (
              <button
                key={round.sessionId}
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  if (!round.isCurrent) {
                    router.push(`/doctor/workspace/${round.sessionId}`);
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                  round.isCurrent
                    ? "border-teal-200 bg-teal-50"
                    : "border-gray-200 bg-white hover:bg-gray-50",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                  {round.isDone ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : round.isCurrent ? (
                    <Play className="h-4 w-4 text-teal-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">
                    {round.roundLabel}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {round.isDone
                      ? time || "Completed"
                      : round.isCurrent
                        ? time || "In progress"
                        : "Pending"}
                  </span>
                </span>
              </button>
            );
          })}

          {isIp && (
            <button
              type="button"
              onClick={() => createRound.mutate()}
              disabled={createRound.isPending}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 px-3 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              {createRound.isPending ? (
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
