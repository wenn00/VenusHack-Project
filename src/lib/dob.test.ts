import { describe, expect, it } from "vitest";
import { isValidDateOfBirth } from "./dob";

const NOW = new Date(2026, 6, 13);

describe("isValidDateOfBirth", () => {
  it("accepts a normal MM/DD/YYYY date", () => {
    expect(isValidDateOfBirth("03/15/1992", NOW)).toBe(true);
  });

  it("rejects free text (previously any non-empty string passed)", () => {
    expect(isValidDateOfBirth("abc", NOW)).toBe(false);
    expect(isValidDateOfBirth("1992", NOW)).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(isValidDateOfBirth("02/30/1992", NOW)).toBe(false);
    expect(isValidDateOfBirth("13/01/1992", NOW)).toBe(false);
  });

  it("rejects future and implausibly old dates", () => {
    expect(isValidDateOfBirth("01/01/2030", NOW)).toBe(false);
    expect(isValidDateOfBirth("01/01/1899", NOW)).toBe(false);
  });

  it("accepts single-digit month/day with or without padding", () => {
    expect(isValidDateOfBirth("3/5/1992", NOW)).toBe(true);
  });
});
