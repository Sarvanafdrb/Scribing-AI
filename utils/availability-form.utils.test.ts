import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultWeeklySchedule,
  normalizeWeeklyFromApi,
  prepareWeeklyForSave,
} from "@/utils/availability-form.utils";

describe("availability-form.utils", () => {
  it("defaultWeeklySchedule returns 7 days with weekdays on", () => {
    const weekly = defaultWeeklySchedule();
    assert.equal(weekly.length, 7);
    assert.equal(weekly[1].isWorking, true);
    assert.equal(weekly[0].isWorking, false);
  });

  it("normalizeWeeklyFromApi maps legacy start/end to sessions", () => {
    const normalized = normalizeWeeklyFromApi([
      {
        dayOfWeek: 1,
        isWorking: true,
        startTime: "10:00",
        endTime: "18:00",
        breaks: [],
      },
    ]);
    assert.deepEqual(normalized[1].workingSessions, [
      { startTime: "10:00", endTime: "18:00" },
    ]);
  });

  it("prepareWeeklyForSave clears off days", () => {
    const weekly = defaultWeeklySchedule();
    weekly[1].isWorking = false;
    const saved = prepareWeeklyForSave(weekly);
    assert.deepEqual(saved[1].workingSessions, []);
    assert.equal(saved[1].isWorking, false);
  });
});