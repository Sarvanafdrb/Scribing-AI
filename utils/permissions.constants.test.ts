import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AVAILABILITY_VIEW,
  AVAILABILITY_EDIT,
  hasPermissionCode,
  normalizePermissionCode,
} from "../constants/permissions";

describe("permissions.constants availability", () => {
  it("normalizes legacy availability:read to AVAILABILITY_VIEW", () => {
    assert.equal(normalizePermissionCode("availability:read"), AVAILABILITY_VIEW);
    assert.equal(
      hasPermissionCode(["availability:read"], AVAILABILITY_VIEW),
      true,
    );
  });

  it("normalizes legacy availability:update to AVAILABILITY_EDIT", () => {
    assert.equal(
      normalizePermissionCode("availability:update"),
      AVAILABILITY_EDIT,
    );
  });

  it("accepts canonical AVAILABILITY_VIEW on admin session payloads", () => {
    assert.equal(
      hasPermissionCode(["AVAILABILITY_VIEW", "USER_VIEW"], AVAILABILITY_VIEW),
      true,
    );
    assert.equal(hasPermissionCode(["USER_VIEW"], AVAILABILITY_VIEW), false);
  });
});