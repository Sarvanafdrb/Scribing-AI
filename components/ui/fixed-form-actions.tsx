"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FixedFormActionsProps {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel: string;
  loadingLabel: string;
  isLoading?: boolean;
  submitClassName?: string;
  maxWidthClassName?: string;
  /** `page` = viewport-fixed bar; `dialog` = sticky bar inside popup */
  variant?: "page" | "dialog";
}

/** Fixed bottom Cancel + Submit bar for create/edit forms. */
export function FixedFormActions({
  onCancel,
  cancelLabel = "Cancel",
  submitLabel,
  loadingLabel,
  isLoading = false,
  submitClassName,
  maxWidthClassName = "max-w-2xl",
  variant = "page",
}: FixedFormActionsProps) {
  const isDialog = variant === "dialog";

  return (
    <div
      className={cn(
        "z-40 border-t bg-white",
        isDialog
          ? "sticky bottom-0 -mx-6 mt-4 px-6"
          : "fixed inset-x-0 bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:left-64",
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          isDialog ? "py-4" : cn("mx-auto p-4", maxWidthClassName),
        )}
      >
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-full bg-white"
          disabled={isLoading}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          className={cn("flex-1 rounded-full", submitClassName)}
          disabled={isLoading}
        >
          {isLoading ? loadingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
