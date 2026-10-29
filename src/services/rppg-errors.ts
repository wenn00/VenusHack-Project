/**
 * Parsing for rPPG backend error responses.
 *
 * FastAPI wraps HTTPException payloads in a `detail` envelope:
 *   { "detail": { "code": "FACE_NOT_DETECTED", "message": "..." } }
 * and framework-generated errors use a plain string detail:
 *   { "detail": "Method Not Allowed" }
 *
 * The previous client read `body.message`, which never exists in either
 * shape, so every backend error surfaced as a generic "Server error" and
 * the machine-readable code was discarded.
 */

import { RppgErrorCode } from "@/types";

const KNOWN_CODES: RppgErrorCode[] = [
  "FACE_NOT_DETECTED",
  "LOW_QUALITY_VIDEO",
  "INTERNAL_ERROR",
  "TIMEOUT",
  "SERVER_BUSY",
];

const FALLBACK = { code: "INTERNAL_ERROR" as RppgErrorCode, message: "Server error" };

export function parseRppgErrorBody(body: unknown): { code: RppgErrorCode; message: string } {
  if (typeof body !== "object" || body === null) return { ...FALLBACK };

  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") {
    return { code: "INTERNAL_ERROR", message: detail };
  }
  // Prefer the FastAPI envelope; fall back to a top-level {code, message}
  // shape so a future backend change to the documented contract keeps working.
  const source = typeof detail === "object" && detail !== null ? detail : body;
  const { code, message } = source as { code?: unknown; message?: unknown };

  if (typeof message !== "string" || message.length === 0) return { ...FALLBACK };
  const knownCode = KNOWN_CODES.find((c) => c === code) ?? "INTERNAL_ERROR";
  return { code: knownCode, message };
}
