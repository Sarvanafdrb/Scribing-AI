import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiNotesMedication } from "../types/ai-notes.types";
import {
  findPrescriptionCompletionIssues,
  hasPrescriptionCompletionWarnings,
  validatePrescriptionMedications,
} from "./prescriptionMedication.utils";

const med = (
  overrides: Partial<AiNotesMedication> & Pick<AiNotesMedication, "medicine">,
): AiNotesMedication => ({
  morning: "",
  afternoon: "",
  night: "",
  days: "",
  instructions: "",
  ...overrides,
});

describe("findPrescriptionCompletionIssues", () => {
  it("returns no issues for a valid prescription", () => {
    const medications = [
      med({
        medicine: "Paracetamol 500mg",
        medicineId: "64a1",
        medicineNameSnapshot: "Paracetamol",
        strengthSnapshot: "500mg",
        morning: "1",
        days: "5",
      }),
    ];

    assert.equal(findPrescriptionCompletionIssues(medications).length, 0);
    assert.equal(hasPrescriptionCompletionWarnings(medications), false);
    assert.deepEqual(validatePrescriptionMedications(medications), { valid: true });
  });

  it("returns no issues for an empty prescription", () => {
    assert.equal(findPrescriptionCompletionIssues([]).length, 0);
    assert.equal(
      findPrescriptionCompletionIssues([med({ medicine: "" })]).length,
      0,
    );
  });

  it("warns when a catalog medicine is missing dosage", () => {
    const medications = [
      med({
        medicine: "Paracetamol 500mg",
        medicineId: "64a1",
        medicineNameSnapshot: "Paracetamol",
        strengthSnapshot: "500mg",
        days: "5",
      }),
    ];

    const issues = findPrescriptionCompletionIssues(medications);
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /dosage\/frequency/i);
    assert.equal(issues[0].rowNumber, 1);
    assert.equal(issues[0].label, "Paracetamol 500mg");
  });

  it("warns when a catalog medicine is missing days", () => {
    const medications = [
      med({
        medicine: "Paracetamol 500mg",
        medicineId: "64a1",
        medicineNameSnapshot: "Paracetamol",
        strengthSnapshot: "500mg",
        morning: "1",
      }),
    ];

    const issues = findPrescriptionCompletionIssues(medications);
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /number of days/i);
  });

  it("warns for incomplete manual medicines", () => {
    const medications = [med({ medicine: "Custom tonic", morning: "1" })];

    const issues = findPrescriptionCompletionIssues(medications);
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /number of days/i);
    assert.equal(issues[0].label, "Custom tonic");
  });

  it("lists multiple incomplete medications", () => {
    const medications = [
      med({ medicine: "Paracetamol", morning: "1" }),
      med({ medicine: "Cetirizine" }),
    ];

    const issues = findPrescriptionCompletionIssues(medications);
    assert.ok(issues.length >= 2);
    assert.deepEqual(
      [...new Set(issues.map((issue) => issue.rowNumber))].sort(),
      [1, 2],
    );
  });

  it("warns when one valid and one incomplete medication are present", () => {
    const medications = [
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
      med({ medicine: "Cetirizine", morning: "1" }),
    ];

    const issues = findPrescriptionCompletionIssues(medications);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].rowNumber, 2);
  });

  it("includes duplicate medication validation", () => {
    const medications = [
      med({
        medicine: "Paracetamol 500mg",
        medicineId: "64a1",
        medicineNameSnapshot: "Paracetamol",
        strengthSnapshot: "500mg",
        morning: "1",
        days: "5",
      }),
      med({
        medicine: "Paracetamol 500mg",
        medicineId: "64a1",
        medicineNameSnapshot: "Paracetamol",
        strengthSnapshot: "500mg",
        morning: "1",
        days: "5",
      }),
    ];

    const issues = findPrescriptionCompletionIssues(medications);
    assert.ok(issues.length >= 2);
    assert.ok(issues.every((issue) => /duplicate medication/i.test(issue.message)));
  });

  it("flags invalid and out-of-range days", () => {
    const invalidDays = findPrescriptionCompletionIssues([
      med({ medicine: "Paracetamol", morning: "1", days: "abc" }),
    ]);
    assert.match(invalidDays[0].message, /positive whole number/i);

    const zeroDays = findPrescriptionCompletionIssues([
      med({ medicine: "Paracetamol", morning: "1", days: "0" }),
    ]);
    assert.match(zeroDays[0].message, /positive whole number/i);

    const tooManyDays = findPrescriptionCompletionIssues([
      med({ medicine: "Paracetamol", morning: "1", days: "366" }),
    ]);
    assert.match(tooManyDays[0].message, /cannot exceed 365/i);
  });

  it("flags empty medicine names when other rows exist", () => {
    const medications = [
      med({ medicine: "" }),
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
    ];

    const issues = findPrescriptionCompletionIssues(medications);
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /incomplete/i);
    assert.equal(issues[0].rowNumber, 1);
  });
});
