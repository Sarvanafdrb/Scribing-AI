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
}

/** Fixed bottom Cancel + Submit bar for admin create pages. */
export function FixedFormActions({
  onCancel,
  cancelLabel = "Cancel",
  submitLabel,
  loadingLabel,
  isLoading = false,
  submitClassName,
  maxWidthClassName = "max-w-2xl",
}: FixedFormActionsProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:left-64">
      <div className={cn("mx-auto flex gap-3 p-4", maxWidthClassName)}>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isLoading}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          className={cn("flex-1", submitClassName)}
          disabled={isLoading}
        >
          {isLoading ? loadingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
