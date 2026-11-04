import assert from "node:assert/strict";
import { test } from "node:test";
import { canStartNextRoundToday, getIpWorkflowStatusLabel } from "./encounter.utils";
import type { Session } from "./session.types";

test("canStartNextRoundToday respects ready workflow but allows pending slots", () => {
  const session = {
    visitType: "inpatient",
    encounter: { encounterType: "IP", status: "ready_for_discharge" },
    allRoundsCompletedToday: true,
    hasNextRoundToday: false,
    todaySchedule: [{ id: "1", status: "completed" }],
  } as unknown as Session;

  assert.equal(canStartNextRoundToday(session), false);

  const withPending = {
    ...session,
    allRoundsCompletedToday: false,
    hasNextRoundToday: true,
    todaySchedule: [
      { id: "1", status: "completed" },
      { id: "2", status: "pending" },
    ],
  } as unknown as Session;

  assert.equal(canStartNextRoundToday(withPending), true);
});

test("getIpWorkflowStatusLabel clarifies not medically discharged", () => {
  const session = {
    visitType: "inpatient",
    encounter: {
      encounterType: "IP",
      status: "ready_for_discharge",
      workflowStatusLabel:
        "Ready for discharge (still admitted — not medically discharged)",
    },
  } as unknown as Session;

  assert.match(getIpWorkflowStatusLabel(session) || "", /not medically discharged/i);
});
