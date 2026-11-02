import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canMarkConsultationCompleted,
  sessionHasConsultationRecording,
} from "./session-status.utils";

describe("consultation completion guards", () => {
  it("blocks completion without recording", () => {
    assert.equal(sessionHasConsultationRecording({}), false);
    assert.equal(
      canMarkConsultationCompleted(
        { status: "ready_for_review" },
        { exportableNotes: true },
      ),
      false,
    );
  });

  it("allows completion when recording exists and notes path is ready", () => {
    assert.equal(
      canMarkConsultationCompleted(
        {
          status: "ready_for_review",
          recordingSegments: [{ duration: 10 }],
        },
        { exportableNotes: true },
      ),
      true,
    );
  });
});
