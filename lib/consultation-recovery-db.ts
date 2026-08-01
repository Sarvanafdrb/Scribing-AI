/**
 * IndexedDB persistence for unfinished doctor consultations.
 * Stores metadata every autosave cycle and pending audio blobs for recovery.
 */

const DB_NAME = "scribing-consultation-recovery";
const DB_VERSION = 1;
const STORE = "consultations";

export type AudioChunkUploadStatus =
  | "idle"
  | "pending"
  | "uploading"
  | "uploaded"
  | "failed";

export interface ConsultationRecoveryState {
  sessionId: string;
  recordingStatus:
    | "idle"
    | "recording"
    | "paused"
    | "interrupted"
    | "resumed"
    | "stopped";
  recordingStartedAt: number | null;
  elapsedSeconds: number;
  previousDurationSeconds: number;
  transcriptDraft: string;
  aiNotesDraft: Record<string, unknown> | null;
  audioChunkUploadStatus: AudioChunkUploadStatus;
  segmentCount: number;
  pendingMimeType: string;
  updatedAt: number;
  unfinished: boolean;
  /**
   * true when the doctor intentionally clicked Stop (normal workflow).
   * false when recording was interrupted unexpectedly (refresh/crash/close).
   */
  recordingEndedNormally: boolean;
  /**
   * ONLY set true on real unexpected interrupt (pagehide / crash / tab close).
   * Autosave must NEVER set this — otherwise a React remount falsely shows Resume popup.
   */
  needsResume: boolean;
}

export interface ConsultationRecoveryRecord extends ConsultationRecoveryState {
  /** Pending in-progress segment audio (not yet uploaded). */
  pendingAudioBlob?: Blob | null;
  pendingChunkBlobs?: Blob[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "sessionId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IDB open failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let request: IDBRequest<T> | void;
    try {
      request = fn(store);
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error || new Error("IDB transaction failed"));
    if (request) {
      request.onerror = () =>
        reject(request.error || new Error("IDB request failed"));
    }
  });
}

export async function saveConsultationRecovery(
  record: ConsultationRecoveryRecord,
): Promise<void> {
  await withStore("readwrite", (store) => {
    store.put({
      ...record,
      updatedAt: Date.now(),
    });
  });
}

export async function getConsultationRecovery(
  sessionId: string,
): Promise<ConsultationRecoveryRecord | null> {
  const result = await withStore<ConsultationRecoveryRecord | undefined>(
    "readonly",
    (store) => store.get(sessionId),
  );
  const record = (result as ConsultationRecoveryRecord | undefined) || null;
  // Hard guarantee: never return recovery for a different consultation.
  if (record && record.sessionId !== sessionId) {
    return null;
  }
  return record;
}

export async function clearConsultationRecovery(
  sessionId: string,
): Promise<void> {
  await withStore("readwrite", (store) => {
    store.delete(sessionId);
  });
}

export async function listUnfinishedConsultations(): Promise<
  ConsultationRecoveryRecord[]
> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const rows = (request.result || []) as ConsultationRecoveryRecord[];
      resolve(rows.filter((row) => row.unfinished));
    };
    request.onerror = () => reject(request.error);
  });
}

/** Also mirror lightweight metadata to localStorage as a fallback index. */
const LS_KEY = "scribing.consultation.recovery.index";

export function mirrorRecoveryIndex(
  sessionId: string,
  meta: Partial<ConsultationRecoveryState> | null,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    if (!meta) {
      delete map[sessionId];
    } else {
      map[sessionId] = {
        sessionId,
        ...meta,
        updatedAt: Date.now(),
      };
    }
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

export function readRecoveryIndex(): Record<string, ConsultationRecoveryState> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
