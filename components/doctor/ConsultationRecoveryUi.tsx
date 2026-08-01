"use client";

import { cn } from "@/lib/utils";

export function ConsultationRecoveryBanner({
  variant,
  className,
}: {
  variant: "interrupted" | "resumed" | null;
  className?: string;
}) {
  if (!variant) return null;

  if (variant === "interrupted") {
    return (
      <div
        className={cn(
          "rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900",
          className,
        )}
        role="status"
      >
        Recording interrupted. Resume to continue.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900",
        className,
      )}
      role="status"
    >
      Consultation resumed successfully.
    </div>
  );
}

export function UnfinishedConsultationDialog({
  open,
  previousDurationSeconds,
  onResume,
  onDiscard,
  isBusy,
}: {
  open: boolean;
  previousDurationSeconds: number;
  onResume: () => void;
  onDiscard: () => void;
  isBusy?: boolean;
}) {
  if (!open) return null;

  const mins = Math.floor(Math.max(0, previousDurationSeconds) / 60);
  const secs = Math.max(0, previousDurationSeconds) % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          An unfinished consultation was detected.
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Previous recording: {mins}m {secs.toString().padStart(2, "0")}s
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isBusy}
            onClick={onDiscard}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Discard Consultation
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onResume}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Resume Consultation
          </button>
        </div>
      </div>
    </div>
  );
}
