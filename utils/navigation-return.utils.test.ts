import { describe, expect, it } from "vitest";
import { buildReturnUrl, sanitizeReturnTo } from "./navigation-return.utils";

describe("sanitizeReturnTo", () => {
  it("allows internal paths", () => {
    expect(sanitizeReturnTo("/sos-emergency")).toBe("/sos-emergency");
  });

  it("rejects external urls", () => {
    expect(sanitizeReturnTo("https://evil.com")).toBeNull();
    expect(sanitizeReturnTo("//evil.com")).toBeNull();
  });
});

describe("buildReturnUrl", () => {
  it("appends query params", () => {
    expect(
      buildReturnUrl("/sos-emergency", { patientId: "abc", patientLinked: "1" }),
    ).toBe("/sos-emergency?patientId=abc&patientLinked=1");
  });
});