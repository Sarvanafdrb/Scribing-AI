import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiNotesMedication } from "../types/ai-notes.types";
import {
  resolveCompletionExportContent,
  type AiNotesExportContent,
} from "./ai-notes-export.utils";
import {
  findPrescriptionCompletionIssues,
  prescriptionMedicationsContentEqual,
} from "./prescriptionMedication.utils";

const baseContent = (
  medications: AiNotesMedication[],
  overrides: Partial<AiNotesExportContent> = {},
): AiNotesExportContent => ({
  metadata: {
    organizationName: "Clinic",
    organizationLogo: undefined,
    organizationAddress: "—",
    organizationContact: "—",
    patientName: "Jane Doe",
    patientPhone: "—",
    patientGender: "Female",
    patientAge: "30",
    doctorName: "Dr Smith",
    doctorEducation: "MBBS",
    doctorSignature: undefined,
    visitType: "outpatient",
    documentDate: "18 Aug 2026",
  },
  complaint: "Headache",
  treatmentHistory: "",
  observation: "",
  suggestedTreatment: "",
  remarks: "",
  summary: "",
  medications,
  ...overrides,
});

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

describe("resolveCompletionExportContent", () => {
  it("uses saved export content when no preview draft exists", () => {
    const saved = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
    ]);

    assert.deepEqual(resolveCompletionExportContent(saved, null), saved);
    assert.deepEqual(resolveCompletionExportContent(saved, undefined), saved);
  });

  it("prefers in-progress preview edits over saved export content", () => {
    const saved = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
    ]);
    const draft = baseContent([
      med({ medicine: "Paracetamol", morning: "2", days: "5" }),
    ]);

    const resolved = resolveCompletionExportContent(saved, draft);
    assert.notEqual(resolved, saved);
    assert.equal(resolved?.medications[0].morning, "2");
  });

  it("returns null when neither saved nor draft content exists", () => {
    assert.equal(resolveCompletionExportContent(null, null), null);
  });
});

describe("consultation completion with preview draft medications", () => {
  it("validates against latest unsaved dosage edits", () => {
    const saved = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
    ]);
    const draft = baseContent([med({ medicine: "Paracetamol", morning: "1" })]);
    const resolved = resolveCompletionExportContent(saved, draft)!;

    assert.equal(findPrescriptionCompletionIssues(saved.medications).length, 0);
    assert.equal(
      findPrescriptionCompletionIssues(resolved.medications).length,
      1,
    );
  });

  it("detects newly added catalog medicines in preview draft", () => {
    const saved = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
    ]);
    const draft = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
      med({
        medicine: "Cetirizine 10mg",
        medicineId: "cat-1",
        medicineNameSnapshot: "Cetirizine",
        strengthSnapshot: "10mg",
        morning: "1",
      }),
    ]);
    const resolved = resolveCompletionExportContent(saved, draft)!;

    assert.equal(resolved.medications.length, 2);
    assert.equal(
      findPrescriptionCompletionIssues(resolved.medications).length,
      1,
    );
  });

  it("reflects medication removals from preview draft", () => {
    const saved = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
      med({ medicine: "Cetirizine", morning: "1", days: "3" }),
    ]);
    const draft = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
    ]);
    const resolved = resolveCompletionExportContent(saved, draft)!;

    assert.equal(resolved.medications.length, 1);
    assert.notEqual(
      prescriptionMedicationsContentEqual(
        saved.medications,
        resolved.medications,
      ),
      true,
    );
  });

  it("does not apply cancelled preview edits when draft is cleared", () => {
    const saved = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
    ]);
    const resolved = resolveCompletionExportContent(saved, null)!;

    assert.equal(resolved.medications.length, 1);
    assert.equal(resolved.medications[0].morning, "1");
  });

  it("keeps saved prescription unchanged when preview is not editing", () => {
    const saved = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
    ]);
    const resolved = resolveCompletionExportContent(saved, null)!;

    assert.equal(
      prescriptionMedicationsContentEqual(
        saved.medications,
        resolved.medications,
      ),
      true,
    );
    assert.equal(findPrescriptionCompletionIssues(resolved.medications).length, 0);
  });

  it("includes new catalog medicine ids in draft content destined for save", () => {
    const saved = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
    ]);
    const draft = baseContent([
      med({ medicine: "Paracetamol", morning: "1", days: "5" }),
      med({
        medicine: "Amoxicillin 500mg",
        medicineId: "cat-amox",
        medicineNameSnapshot: "Amoxicillin",
        strengthSnapshot: "500mg",
        morning: "1",
        days: "7",
        catalogCostPreview: 42,
      }),
    ]);
    const resolved = resolveCompletionExportContent(saved, draft)!;
    const added = resolved.medications[1];

    assert.equal(added.medicineId, "cat-amox");
    assert.equal(added.catalogCostPreview, 42);
    assert.equal(findPrescriptionCompletionIssues(resolved.medications).length, 0);
  });
});
