import { describe, expect, it } from "vitest";
import { parseRppgErrorBody } from "./rppg-errors";

describe("parseRppgErrorBody", () => {
  it("extracts code and message from FastAPI's detail envelope", () => {
    // Exact shape FastAPI produces for main.py's HTTPException(detail={...}):
    const body = {
      detail: { code: "FACE_NOT_DETECTED", message: "Couldn't reliably track a face in the video." },
    };
    expect(parseRppgErrorBody(body)).toEqual({
      code: "FACE_NOT_DETECTED",
      message: "Couldn't reliably track a face in the video.",
    });
  });

  it("maps LOW_QUALITY_VIDEO through unchanged", () => {
    const body = { detail: { code: "LOW_QUALITY_VIDEO", message: "Too dark." } };
    expect(parseRppgErrorBody(body)).toEqual({ code: "LOW_QUALITY_VIDEO", message: "Too dark." });
  });

  it("falls back to INTERNAL_ERROR for unknown codes", () => {
    const body = { detail: { code: "SOMETHING_NEW", message: "hm" } };
    expect(parseRppgErrorBody(body)).toEqual({ code: "INTERNAL_ERROR", message: "hm" });
  });

  it("handles FastAPI string details (e.g. framework-generated errors)", () => {
    expect(parseRppgErrorBody({ detail: "Method Not Allowed" })).toEqual({
      code: "INTERNAL_ERROR",
      message: "Method Not Allowed",
    });
  });

  it("still accepts a legacy top-level {code, message} shape", () => {
    const body = { code: "FACE_NOT_DETECTED", message: "No face." };
    expect(parseRppgErrorBody(body)).toEqual({ code: "FACE_NOT_DETECTED", message: "No face." });
  });

  it("degrades to a generic server error for junk bodies", () => {
    expect(parseRppgErrorBody(null)).toEqual({ code: "INTERNAL_ERROR", message: "Server error" });
    expect(parseRppgErrorBody("<html>")).toEqual({ code: "INTERNAL_ERROR", message: "Server error" });
    expect(parseRppgErrorBody({})).toEqual({ code: "INTERNAL_ERROR", message: "Server error" });
  });
});
