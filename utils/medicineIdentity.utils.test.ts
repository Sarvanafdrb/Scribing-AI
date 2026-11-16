import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMedicineDuplicateIdentity,
  medicineDuplicateIdentitiesMatch,
  normalizeMedicineStrengthForComparison,
} from "./medicineIdentity.utils";

describe("normalizeMedicineStrengthForComparison (web)", () => {
  it("equates mg-bearing and bare numeric strengths", () => {
    assert.equal(
      normalizeMedicineStrengthForComparison("250 MG"),
      normalizeMedicineStrengthForComparison("250"),
    );
    assert.equal(normalizeMedicineStrengthForComparison("250mg"), "250");
  });

  it("does not equate mcg with mg", () => {
    assert.notEqual(
      normalizeMedicineStrengthForComparison("250 mcg"),
      normalizeMedicineStrengthForComparison("250"),
    );
  });
});

describe("buildMedicineDuplicateIdentity (web)", () => {
  it("matches trimmed, case-insensitive names", () => {
    const a = buildMedicineDuplicateIdentity({
      name: "Paracetamol",
      strength: "250 mg",
      form: "Tablet",
      route: "Oral",
    });
    const b = buildMedicineDuplicateIdentity({
      name: " paracetamol ",
      strength: "250",
      form: "tablet",
      route: "oral",
    });
    assert.equal(medicineDuplicateIdentitiesMatch(a, b), true);
  });
});
