"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type InlineFieldType = "text" | "textarea" | "email" | "url" | "select";

export interface InlineSelectOption {
  value: string;
  label: string;
}

interface OrganizationInlineFieldProps {
  label: string;
  value: string;
  displayValue?: React.ReactNode;
  editable?: boolean;
  type?: InlineFieldType;
  options?: InlineSelectOption[];
  isSaving?: boolean;
  onSave?: (value: string) => Promise<void> | void;
  className?: string;
}

export function OrganizationInlineField({
  label,
  value,
  displayValue,
  editable = true,
  type = "text",
  options = [],
  isSaving = false,
  onSave,
  className,
}: OrganizationInlineFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  const startEdit = () => {
    if (!editable || isSaving) return;
    setDraft(value);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    const next = draft.trim();
    if (!onSave || next === (value || "").trim()) {
      setIsEditing(false);
      return;
    }
    await onSave(next);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group grid grid-cols-[minmax(7rem,38%)_1fr] items-start gap-3 border-b border-border/60 py-3 last:border-b-0",
        className,
      )}
    >
      <dt className="pt-0.5 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0">
        {isEditing ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              {type === "textarea" ? (
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  className="rounded-xl"
                  autoFocus
                />
              ) : type === "select" ? (
                <Select value={draft || undefined} onValueChange={setDraft}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder={`Select ${label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={type === "email" ? "email" : type === "url" ? "url" : "text"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="rounded-xl"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveEdit();
                    }
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="sm"
                className="rounded-full px-3"
                onClick={() => void saveEdit()}
                disabled={isSaving}
                aria-label={`Save ${label}`}
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                )}
                <span className="inline text-xs">Save</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full px-3"
                onClick={cancelEdit}
                disabled={isSaving}
                aria-label={`Cancel ${label}`}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                <span className="inline text-xs">Cancel</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-8 items-start justify-between gap-2">
            <div className="min-w-0 flex-1 text-sm font-medium text-foreground break-words">
              {displayValue ?? (value || (
                <span className="font-normal text-muted-foreground">—</span>
              ))}
            </div>
            {editable ? (
              <button
                type="button"
                onClick={startEdit}
                className="mt-0.5 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                aria-label={`Edit ${label}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        )}
      </dd>
    </div>
  );
}
