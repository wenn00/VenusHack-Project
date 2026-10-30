import { describe, expect, it } from "vitest";
import { pageTopPadding } from "./page-layout";

describe("space below the top safe area", () => {
  it("preserves the browser header offset without an inset", () => {
    expect(pageTopPadding(0)).toBe(48);
  });
  it("accounts for a conventional status bar", () => {
    expect(20 + pageTopPadding(20)).toBe(48);
  });
  it("keeps a 16pt gap below tall notch and Dynamic Island safe areas", () => {
    for (const inset of [44, 59, 62]) expect(pageTopPadding(inset)).toBe(16);
  });
});
