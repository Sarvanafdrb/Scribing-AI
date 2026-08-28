import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSmsStatusLabel, isSmsInFlight } from "./sms.utils";

describe("sms status utils", () => {
  it("maps known statuses to labels", () => {
    assert.equal(getSmsStatusLabel("sent"), "Sent");
    assert.equal(getSmsStatusLabel("delivered"), "Delivered");
    assert.equal(getSmsStatusLabel("failed"), "Failed");
    assert.equal(getSmsStatusLabel(undefined), "Not sent");
  });

  it("detects in-flight statuses", () => {
    assert.equal(isSmsInFlight("sending"), true);
    assert.equal(isSmsInFlight("sent"), false);
  });
});
