/**
 * Helpers for uploading a recording segment (append-only; never overwrites).
 *
 * Prefers direct browser → S3 PUT (presigned). If that fails (common cause:
 * missing S3 bucket CORS), falls back to API multipart upload so recording /
 * transcript still works.
 */
import { recordingService } from "@/services/recording.service";
import type { Session } from "@/types/session.types";

async function uploadSegmentViaApi(params: {
  sessionId: string;
  blob: Blob;
  duration: number;
  fileName: string;
  statusAfter: string;
  finalize: boolean;
}): Promise<void> {
  const { sessionId, blob, duration, fileName, statusAfter, finalize } = params;

  if (finalize) {
    await recordingService.uploadFile(sessionId, blob, duration, fileName, {
      finalize: false,
      statusAfter: "uploading",
    });
    return;
  }

  await recordingService.uploadSegment(
    sessionId,
    blob,
    duration,
    fileName,
    statusAfter,
  );
}

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

  let usedDirectS3 = false;

  try {
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
        throw new Error(
          `S3 upload failed with status ${uploadResponse.status}`,
        );
      }

      usedDirectS3 = true;

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
      await uploadSegmentViaApi({
        sessionId,
        blob,
        duration,
        fileName: uniqueName,
        statusAfter: finalize ? "uploading" : statusAfter,
        finalize,
      });
    }
  } catch (error) {
    // CORS / network / 403 on preflight — route through API (server → S3).
    if (usedDirectS3) {
      throw error;
    }

    console.warn(
      "[recording] Direct S3 upload failed; falling back to API upload",
      error,
    );

    await uploadSegmentViaApi({
      sessionId,
      blob,
      duration,
      fileName: uniqueName,
      statusAfter: finalize ? "uploading" : statusAfter,
      finalize,
    });
  }

  if (finalize) {
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
