import { describe, expect, it } from "vitest";
import {
  DEMO_AI_CALL_LIMIT,
  demoQuotaExceeded,
  demoWindowOpen,
  isGatewayBusy,
  selectModel,
} from "./demo-policy.ts";

describe("demoWindowOpen", () => {
  const until = "2026-10-31T07:00:00Z";

  it("is open before the configured end", () => {
    expect(demoWindowOpen(until, new Date("2026-10-30T20:00:00Z"))).toBe(true);
  });

  it("closes once the end has passed", () => {
    expect(demoWindowOpen(until, new Date("2026-10-31T07:00:01Z"))).toBe(false);
  });

  it("fails closed when the secret is missing", () => {
    expect(demoWindowOpen(undefined, new Date("2026-10-30T20:00:00Z"))).toBe(false);
  });

  it("fails closed when the secret is not a date", () => {
    expect(demoWindowOpen("not-a-date", new Date("2026-10-30T20:00:00Z"))).toBe(false);
  });
});

describe("demoQuotaExceeded", () => {
  it("allows exactly the configured number of calls", () => {
    expect(DEMO_AI_CALL_LIMIT).toBe(20);
    expect(demoQuotaExceeded(20)).toBe(false);
  });

  it("rejects the call after the limit", () => {
    expect(demoQuotaExceeded(21)).toBe(true);
  });
});

describe("selectModel", () => {
  it("uses the demo model for anonymous visitors when one is configured", () => {
    expect(selectModel(true, { model: "m", demoModel: "d" }, "f")).toBe("d");
  });

  it("falls back to the normal model for visitors without a demo model", () => {
    expect(selectModel(true, { model: "m" }, "f")).toBe("m");
  });

  it("never gives email users the demo model", () => {
    expect(selectModel(false, { model: "m", demoModel: "d" }, "f")).toBe("m");
  });

  it("uses the built-in default when nothing is configured", () => {
    expect(selectModel(false, {}, "f")).toBe("f");
  });
});

describe("isGatewayBusy", () => {
  it("treats a gateway 429 as busy", () => {
    expect(isGatewayBusy(429)).toBe(true);
  });

  it("does not treat other failures as busy", () => {
    expect(isGatewayBusy(502)).toBe(false);
  });
});
