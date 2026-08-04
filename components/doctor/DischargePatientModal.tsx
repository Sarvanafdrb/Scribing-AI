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
import { useSession } from "@/hooks/sessions/useSession";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import {
  buildAiNotesExportContent,
  downloadAiNotesPdf,
  hasExportableAiNotes,
} from "@/utils/ai-notes-export.utils";
import type { DischargeDisposition } from "@/types/encounter.types";
import type { AiNotes } from "@/types/ai-notes.types";

interface DischargePatientModalProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_AI_NOTES: AiNotes = {
  status: "completed",
  summary: "",
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  remarks: "",
  medications: [],
};

const DISPOSITIONS: { value: DischargeDisposition; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "follow_up", label: "Follow-up" },
  { value: "transfer", label: "Transfer" },
  { value: "lama", label: "Left Against Medical Advice" },
  { value: "other", label: "Other" },
];

export function DischargePatientModal({
  sessionId,
  open,
  onOpenChange,
}: DischargePatientModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession(sessionId);
  const { aiNotes, saveExportContent } = useAiNotes(sessionId);

  const [dischargedAt, setDischargedAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [notes, setNotes] = useState("");
  const [disposition, setDisposition] =
    useState<DischargeDisposition>("home");
  const [followUpDate, setFollowUpDate] = useState("");
  const [generateSummary, setGenerateSummary] = useState(true);

  useEffect(() => {
    if (!open) {
      document.body.style.removeProperty("pointer-events");
      document.body.style.removeProperty("overflow");
      return;
    }
    setDischargedAt(new Date().toISOString().slice(0, 16));
    setNotes("");
    setDisposition("home");
    setFollowUpDate("");
    setGenerateSummary(true);
  }, [open]);

  const dischargeMutation = useMutation({
    mutationFn: async () => {
      // Discharge first so the queue updates even if PDF generation fails.
      const result = await encounterService.dischargePatient(sessionId, {
        dischargedAt: dischargedAt
          ? new Date(dischargedAt).toISOString()
          : undefined,
        disposition,
        notes: notes.trim() || undefined,
        followUpDate:
          disposition === "follow_up" && followUpDate
            ? followUpDate
            : undefined,
        generateSummary,
      });

      if (generateSummary && session) {
        try {
          const notesPayload = hasExportableAiNotes(aiNotes)
            ? aiNotes!
            : { ...EMPTY_AI_NOTES, ...aiNotes, status: "completed" as const };
          const content = buildAiNotesExportContent(notesPayload, session);
          await saveExportContent(content);
          await downloadAiNotesPdf(content, session);
        } catch {
          toast.error(
            "Patient discharged, but discharge summary PDF could not be generated",
          );
        }
      }

      return result;
    },
    onSuccess: () => {
      // Close overlay and clear Radix body locks before navigating —
      // otherwise soft navigation can stall on a locked / spinning page.
      onOpenChange(false);
      document.body.style.removeProperty("pointer-events");
      document.body.style.removeProperty("overflow");

      toast.success("Patient discharged — removed from doctor queue");

      // Navigate immediately; refresh queue in the background.
      router.replace("/doctor/workspace");
      void queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      void queryClient.removeQueries({
        queryKey: sessionKeys.detail(sessionId),
      });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(
        error?.response?.data?.message || "Failed to discharge patient",
      );
    },
  });

  const canSubmit =
    Boolean(dischargedAt) &&
    Boolean(disposition) &&
    !dischargeMutation.isPending &&
    (disposition !== "follow_up" || Boolean(followUpDate));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Discharge Patient</DialogTitle>
          <DialogDescription>
            Complete the inpatient stay. The encounter will be marked Discharged
            and removed from the doctor queue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Field label="Discharge Date">
            <input
              type="datetime-local"
              value={dischargedAt}
              onChange={(e) => setDischargedAt(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </Field>

          <Field label="Disposition">
            <select
              value={disposition}
              onChange={(e) =>
                setDisposition(e.target.value as DischargeDisposition)
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            >
              {DISPOSITIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {disposition === "follow_up" && (
            <Field label="Follow-up Date">
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
              />
            </Field>
          )}

          <Field label="Discharge Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional clinical notes for discharge"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50">
            <input
              type="checkbox"
              checked={generateSummary}
              onChange={(e) => setGenerateSummary(e.target.checked)}
              className="accent-teal-600"
            />
            Generate Discharge Summary (PDF)
          </label>
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
            onClick={() => dischargeMutation.mutate()}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {dischargeMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Discharge
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
