/**
 * Helpers for uploading a recording segment (append-only; never overwrites).
 */
import { recordingService } from "@/services/recording.service";
import type { Session } from "@/types/session.types";

export async function uploadAudioSegment(params: {
  sessionId: string;
  blob: Blob;
  duration: number;
  fileName: string;
  mimeType: string;
  statusAfter?: string;
  /** When true, append this segment then finalize ALL segments for transcription. */
  finalize?: boolean;
}): Promise<Session> {
  const {
    sessionId,
    blob,
    duration,
    fileName,
    mimeType,
    statusAfter = "interrupted",
    finalize = false,
  } = params;

  // Unique name so object storage never collides across resume segments.
  const uniqueName = `segment_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const uploadConfig = await recordingService.getUploadUrl(
    sessionId,
    uniqueName,
    mimeType,
  );

  if (uploadConfig.mode === "s3" && uploadConfig.uploadUrl) {
    const uploadResponse = await fetch(uploadConfig.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: blob,
    });
    if (!uploadResponse.ok) {
      throw new Error("Failed to upload recording segment to S3");
    }

    // Always append — never replace prior segments.
    await recordingService.completeSegment(sessionId, {
      key: uploadConfig.key || undefined,
      audioUrl: uploadConfig.audioUrl || undefined,
      duration,
      contentType: mimeType,
      fileName: uniqueName,
      statusAfter: finalize ? "uploading" : statusAfter,
      finalize: false,
    });
  } else {
    await recordingService.uploadSegment(
      sessionId,
      blob,
      duration,
      uniqueName,
      finalize ? "uploading" : statusAfter,
    );
  }

  if (finalize) {
    // Process every stored segment (chronological merge → one transcript).
    return recordingService.finalize(sessionId);
  }

  return recordingService.autosave(sessionId, {
    elapsedSeconds: duration,
    recordingStatus: statusAfter,
  });
}

export function formatConsultationDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}
