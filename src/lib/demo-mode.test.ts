import { describe, expect, it } from "vitest";
import { demoEntryAction } from "./demo-mode";

describe("demoEntryAction", () => {
  it("signs a new visitor in anonymously", () => {
    expect(demoEntryAction(null)).toBe("sign_in");
  });

  it("reuses an existing demo session instead of creating a second user", () => {
    // Reopening the QR link must keep the same persona, not mint a new
    // anonymous user (and a new seeded copy) on every visit.
    expect(demoEntryAction({ user: { is_anonymous: true } })).toBe("continue");
  });

  it("never signs a team member's email session out", () => {
    expect(demoEntryAction({ user: { is_anonymous: false } })).toBe("continue");
  });
});
