import { describe, expect, it } from "vitest";
import { pageTopPadding, screenTopPadding } from "./page-layout";

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


describe("screen top padding overrides", () => {
  it("keeps a branded page flush with its header on web and iOS", () => {
    for (const inset of [0, 62]) expect(screenTopPadding(inset, { paddingTop: 0 })).toBe(0);
  });
  it("respects embedded forms and camera shorthand overrides", () => {
    expect(screenTopPadding(62, { paddingVertical: 0 })).toBe(0);
    expect(screenTopPadding(62, { padding: 0 })).toBe(0);
    expect(screenTopPadding(0, { padding: 20, paddingVertical: 12, paddingTop: 0 })).toBe(0);
  });
  it("preserves explicit percentage padding and safe-area defaults", () => {
    expect(screenTopPadding(62, { paddingTop: "5%" })).toBe("5%");
    expect(screenTopPadding(62)).toBe(16);
    expect(screenTopPadding(0)).toBe(48);
  });
});
