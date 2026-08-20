import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getDoctorDatePresetRange,
  parseLocalInputDate,
  toLocalInputDate,
} from "./doctor-dashboard-date-range";

describe("doctor-dashboard-date-range", () => {
  it("parses YYYY-MM-DD as local midnight", () => {
    const date = parseLocalInputDate("2026-08-21");
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 7);
    assert.equal(date.getDate(), 21);
    assert.equal(date.getHours(), 0);
    assert.equal(date.getMinutes(), 0);
  });

  it("formats local input date without UTC shift", () => {
    const date = new Date(2026, 7, 21, 15, 30, 0);
    assert.equal(toLocalInputDate(date), "2026-08-21");
  });

  it("this-week preset spans Monday through Sunday", () => {
    // Thursday 2026-08-20
    const reference = new Date(2026, 7, 20, 12, 0, 0);
    const range = getDoctorDatePresetRange("this-week", reference);
    assert.equal(range.start, "2026-08-17");
    assert.equal(range.end, "2026-08-23");
  });

  it("last-7-days preset includes today", () => {
    const reference = new Date(2026, 7, 20, 12, 0, 0);
    const range = getDoctorDatePresetRange("last-7-days", reference);
    assert.equal(range.end, "2026-08-20");
    assert.equal(range.start, "2026-08-14");
  });

  it("single-day custom range uses same start and end", () => {
    const start = parseLocalInputDate("2026-08-21");
    const end = parseLocalInputDate("2026-08-21");
    assert.equal(toLocalInputDate(start), toLocalInputDate(end));
  });
});
