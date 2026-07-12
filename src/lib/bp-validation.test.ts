import { describe, expect, it } from "vitest";
import { validateBpInput } from "./bp-validation";

describe("validateBpInput", () => {
  it("accepts a normal reading", () => {
    expect(validateBpInput("120", "80", "72")).toEqual({
      ok: true,
      systolic: 120,
      diastolic: 80,
      pulse: 72,
    });
  });

  it("accepts an empty pulse as null", () => {
    expect(validateBpInput("120", "80", "")).toEqual({
      ok: true,
      systolic: 120,
      diastolic: 80,
      pulse: null,
    });
  });

  it("rejects missing values", () => {
    expect(validateBpInput("", "80", "")).toMatchObject({ ok: false });
    expect(validateBpInput("120", "", "")).toMatchObject({ ok: false });
  });

  it("rejects the classic dropped-digit typo (12 for 120)", () => {
    // Previously accepted, stored, and classified green ("Looking good").
    expect(validateBpInput("12", "8", "")).toMatchObject({ ok: false });
  });

  it("rejects implausibly high values (double-tap 1400)", () => {
    expect(validateBpInput("1400", "90", "")).toMatchObject({ ok: false });
  });

  it("rejects systolic <= diastolic", () => {
    expect(validateBpInput("80", "120", "")).toMatchObject({ ok: false });
    expect(validateBpInput("90", "90", "")).toMatchObject({ ok: false });
  });

  it("rejects non-numeric text instead of silently truncating (12abc -> 12)", () => {
    expect(validateBpInput("12abc", "80", "")).toMatchObject({ ok: false });
  });

  it("rejects a non-numeric pulse instead of storing null silently", () => {
    expect(validateBpInput("120", "80", "abc")).toMatchObject({ ok: false });
  });

  it("treats a whitespace-only pulse as empty", () => {
    expect(validateBpInput("120", "80", " ")).toMatchObject({ ok: true, pulse: null });
  });

  it("accepts boundary values", () => {
    expect(validateBpInput("60", "30", "")).toMatchObject({ ok: true });
    expect(validateBpInput("260", "200", "")).toMatchObject({ ok: true });
  });
});
