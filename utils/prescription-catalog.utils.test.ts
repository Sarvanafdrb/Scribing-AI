import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { MedicineSearchResult } from "@/types/medicine.types";
import {
  buildCatalogSearchQueryForMedication,
  enrichMedicationFromCatalogCandidates,
  enrichMedicationWithCatalogMatch,
  findExactCatalogMedicineMatch,
  hydrateSavedPrescriptionMedications,
  resolveMedicationCatalogLookupIdentity,
} from "@/utils/prescription-catalog.utils";
import { getPrescriptionCostSummary } from "@/utils/prescriptionPrice.utils";

const catalog = (
  overrides: Partial<MedicineSearchResult> & Pick<MedicineSearchResult, "id">,
): MedicineSearchResult => ({
  organizationId: "org-1",
  name: "Paracetamol",
  strength: "500 mg",
  form: "Tablet",
  cost: 5,
  indications: [],
  isActive: true,
  matchedConditions: [],
  matchScore: 1,
  matchPriority: "name",
  ...overrides,
});

const med = (overrides: Partial<AiNotesMedication> = {}): AiNotesMedication => ({
  medicine: "Paracetamol 500 mg",
  medicineNameSnapshot: "Paracetamol",
  strengthSnapshot: "500 mg",
  formSnapshot: "Tablet",
  morning: "1",
  afternoon: "0",
  night: "1",
  days: "3",
  ...overrides,
});

describe("prescription-catalog.utils", () => {
  it("hydrates saved medications without dropping price snapshots", () => {
    const hydrated = hydrateSavedPrescriptionMedications([
      med({
        medicineId: "cat-500",
        priceAtPrescription: 5,
        catalogCostPreview: 7,
      }),
    ]);

    assert.equal(hydrated.length, 1);
    assert.equal(hydrated[0].medicineId, "cat-500");
    assert.equal(hydrated[0].priceAtPrescription, 5);
    assert.equal(hydrated[0].catalogCostPreview, 7);
  });

  it("matches AI medication to the exact catalog strength", () => {
    const candidates = [
      catalog({ id: "a", strength: "500 mg", cost: 5 }),
      catalog({ id: "b", strength: "650 mg", cost: 6 }),
    ];

    const match = findExactCatalogMedicineMatch(
      med({ medicineId: undefined }),
      candidates,
    );

    assert.equal(match?.id, "a");
    assert.equal(match?.cost, 5);
  });

  it("does not match when multiple strengths share a name but strength is missing", () => {
    const candidates = [
      catalog({ id: "a", strength: "500 mg", cost: 5 }),
      catalog({ id: "b", strength: "650 mg", cost: 6 }),
    ];

    const match = findExactCatalogMedicineMatch(
      med({
        medicine: "Paracetamol",
        medicineNameSnapshot: "Paracetamol",
        strengthSnapshot: "",
      }),
      candidates,
    );

    assert.equal(match, null);
  });

  it("enriches AI medication with its own catalog price without reusing another strength", () => {
    const candidates = [
      catalog({ id: "a", strength: "500 mg", cost: 5 }),
      catalog({ id: "b", strength: "650 mg", cost: 6 }),
    ];

    const enriched500 = enrichMedicationFromCatalogCandidates(
      med({ medicineId: undefined }),
      candidates,
    );
    const enriched650 = enrichMedicationFromCatalogCandidates(
      med({
        medicine: "Paracetamol 650 mg",
        strengthSnapshot: "650 mg",
        medicineId: undefined,
      }),
      candidates,
    );

    assert.equal(enriched500.medicineId, "a");
    assert.equal(enriched500.catalogCostPreview, 5);
    assert.equal(enriched650.medicineId, "b");
    assert.equal(enriched650.catalogCostPreview, 6);
  });

  it("preserves historical priceAtPrescription when enriching", () => {
    const enriched = enrichMedicationWithCatalogMatch(
      med({ priceAtPrescription: 4.5 }),
      catalog({ id: "a", cost: 5 }),
    );

    assert.equal(enriched.priceAtPrescription, 4.5);
    assert.equal(enriched.catalogCostPreview, 5);
    assert.equal(enriched.medicineId, "a");
  });

  it("preserves AI dosage fields when enriching from catalog defaults", () => {
    const enriched = enrichMedicationWithCatalogMatch(
      med({
        morning: "1",
        afternoon: "0",
        night: "1",
        days: "2",
        instructions: "After food",
      }),
      catalog({ id: "a", cost: 5 }),
    );

    assert.equal(enriched.days, "2");
    assert.equal(enriched.instructions, "After food");
    assert.equal(enriched.morning, "1");
    assert.equal(enriched.night, "1");
  });

  it("builds a search query from name and strength", () => {
    const query = buildCatalogSearchQueryForMedication(med());
    assert.equal(query, "Paracetamol 500 mg");
  });

  it("resolves strength from the medicine field when snapshot is empty", () => {
    const identity = resolveMedicationCatalogLookupIdentity(
      med({
        medicine: "Paracetamol 500 mg",
        medicineNameSnapshot: "Paracetamol",
        strengthSnapshot: "",
      }),
    );

    assert.equal(identity.name, "paracetamol");
    assert.equal(identity.strength, "500mg");
  });

  it("sums independent catalog prices for two strengths", () => {
    const candidates = [
      catalog({ id: "a", strength: "500 mg", cost: 5 }),
      catalog({ id: "b", strength: "650 mg", cost: 6 }),
    ];

    const meds = [
      enrichMedicationFromCatalogCandidates(med({ medicineId: undefined }), candidates),
      enrichMedicationFromCatalogCandidates(
        med({
          medicine: "Paracetamol 650 mg",
          strengthSnapshot: "650 mg",
          medicineId: undefined,
        }),
        candidates,
      ),
    ];

    const summary = getPrescriptionCostSummary(meds);
    assert.equal(summary.grandTotal, 66);
  });
});
