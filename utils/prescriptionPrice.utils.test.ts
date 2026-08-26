import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiNotesMedication } from "@/types/ai-notes.types";
import {
  getMedicationCostBreakdown,
  getMedicationDailyQuantity,
  getMedicationDisplayTotalCost,
  getPrescriptionCostSummary,
} from "@/utils/prescriptionPrice.utils";

const med = (overrides: Partial<AiNotesMedication> = {}): AiNotesMedication => ({
  medicine: "Paracetamol 650",
  medicineId: "med-1",
  medicineNameSnapshot: "Paracetamol",
  strengthSnapshot: "650",
  formSnapshot: "Tablet",
  catalogCostPreview: 5,
  morning: "1",
  afternoon: "0",
  night: "1",
  days: "3",
  ...overrides,
});

describe("prescriptionPrice.utils", () => {
  it("calculates daily quantity from morning, afternoon, and night doses", () => {
    assert.equal(getMedicationDailyQuantity(med()), 2);
    assert.equal(
      getMedicationDailyQuantity(
        med({ morning: "1", afternoon: "1", night: "1" }),
      ),
      3,
    );
    assert.equal(
      getMedicationDailyQuantity(
        med({ morning: "2", afternoon: "0", night: "0" }),
      ),
      2,
    );
  });

  it("calculates course cost from unit price, daily quantity, and duration", () => {
    const breakdown = getMedicationCostBreakdown(med());
    assert.ok(breakdown);
    assert.equal(breakdown.unitPrice, 5);
    assert.equal(breakdown.dailyQuantity, 2);
    assert.equal(breakdown.durationDays, 3);
    assert.equal(breakdown.totalQuantity, 6);
    assert.equal(breakdown.dailyCost, 10);
    assert.equal(breakdown.courseTotalCost, 30);
    assert.equal(getMedicationDisplayTotalCost(med()), 30);
  });

  it("uses monthly estimate for ongoing medicines", () => {
    const ongoing = med({ days: "Ongoing", morning: "1", night: "0" });
    const breakdown = getMedicationCostBreakdown(ongoing);
    assert.ok(breakdown);
    assert.equal(breakdown.isOngoing, true);
    assert.equal(breakdown.dailyCost, 5);
    assert.equal(breakdown.monthlyEstimate, 150);
    assert.equal(getMedicationDisplayTotalCost(ongoing), 150);
  });

  it("aggregates fixed course and ongoing estimates for the prescription", () => {
    const summary = getPrescriptionCostSummary([
      med(),
      med({
        medicine: "Metformin 500",
        medicineId: "med-2",
        catalogCostPreview: 2,
        morning: "1",
        afternoon: "0",
        night: "0",
        days: "Ongoing",
      }),
    ]);

    assert.equal(summary.courseTotal, 30);
    assert.equal(summary.monthlyOngoing, 60);
    assert.equal(summary.grandTotal, 90);
    assert.equal(summary.hasFixedDuration, true);
    assert.equal(summary.hasOngoing, true);
  });
});
