"use client";

import { useState } from "react";
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
import { getEncounterType, nextSuggestedRoundType } from "@/utils/encounter.utils";
import type { Session } from "@/types/session.types";

interface SaveConsultationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  sessionId: string;
}

type NextAction = "finish" | "next_round";

export function SaveConsultationDialog({
  open,
  onOpenChange,
  session,
  sessionId,
}: SaveConsultationDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isIp = getEncounterType(session) === "IP";
  const [action, setAction] = useState<NextAction>("finish");

  const nextRound = useMutation({
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
      toast.success("Next round ready — recording reset");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error?.response?.data?.message || "Failed to start next round");
    },
  });

  const handleConfirm = () => {
    if (action === "next_round" && isIp) {
      nextRound.mutate();
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Consultation Saved Successfully</DialogTitle>
          <DialogDescription>Next Action:</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50">
            <input
              type="radio"
              name="next-action"
              checked={action === "finish"}
              onChange={() => setAction("finish")}
              className="accent-teal-600"
            />
            Finish Visit
          </label>

          {isIp && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50">
              <input
                type="radio"
                name="next-action"
                checked={action === "next_round"}
                onChange={() => setAction("next_round")}
                className="accent-teal-600"
              />
              Start Next Round
            </label>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={nextRound.isPending}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {nextRound.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
