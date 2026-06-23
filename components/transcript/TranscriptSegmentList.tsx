"use client";

import { Badge } from "@/components/ui/badge";
import {
  formatConfidence,
  formatLanguage,
  formatTimestamp,
  TranscriptSegment,
  TranscriptSpeaker,
} from "@/types/transcript.types";
import { cn } from "@/lib/utils";
import { Stethoscope, User } from "lucide-react";

interface TranscriptSegmentListProps {
  segments: TranscriptSegment[];
  searchQuery?: string;
  activeSegmentId?: string | null;
  editingSegmentId?: string | null;
  editValue?: string;
  onEditStart?: (segment: TranscriptSegment) => void;
  onEditChange?: (value: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  showTranslation?: boolean;
}

const speakerStyles: Record<
  TranscriptSpeaker,
  { badge: string; icon: typeof Stethoscope }
> = {
  doctor: {
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Stethoscope,
  },
  patient: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: User,
  },
  unknown: {
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    icon: User,
  },
};

const highlightText = (text: string, query?: string) => {
  if (!query?.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-yellow-200 px-0.5">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
};

export function TranscriptSegmentList({
  segments,
  searchQuery,
  activeSegmentId,
  editingSegmentId,
  editValue,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  showTranslation = false,
}: TranscriptSegmentListProps) {
  if (segments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No transcript segments yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((segment) => {
        const style = speakerStyles[segment.speaker];
        const Icon = style.icon;
        const isEditing = editingSegmentId === segment.id;
        const isActive = activeSegmentId === segment.id;

        return (
          <div
            key={segment.id}
            className={cn(
              "rounded-lg border p-4 transition-colors",
              isActive && "border-blue-400 bg-blue-50/40",
            )}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={style.badge}>
                <Icon className="mr-1 h-3 w-3" />
                {segment.speaker.charAt(0).toUpperCase() +
                  segment.speaker.slice(1)}
              </Badge>
              <Badge variant="outline">
                {formatTimestamp(segment.start)} – {formatTimestamp(segment.end)}
              </Badge>
              <Badge variant="outline">{formatLanguage(segment.language)}</Badge>
              <Badge variant="outline">
                {formatConfidence(segment.confidence)}
              </Badge>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  className="min-h-20 w-full rounded-md border bg-white p-3 text-sm"
                  value={editValue}
                  onChange={(event) => onEditChange?.(event.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
                    onClick={onEditSave}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1.5 text-sm"
                    onClick={onEditCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm leading-6 text-gray-900">
                  {highlightText(segment.text, searchQuery)}
                </p>
                {showTranslation && segment.translation && (
                  <p className="rounded-md bg-slate-50 p-2 text-sm text-muted-foreground">
                    {segment.translation}
                  </p>
                )}
                {onEditStart && (
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:underline"
                    onClick={() => onEditStart(segment)}
                  >
                    Edit segment
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
