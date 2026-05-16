/**
 * rPPG measurement types — mirrors the API contract in docs/07-rppg-plan.md.
 */

export interface RppgResult {
  bpm: number;
  hrvMs: number;
  confidence: number;
  durationSeconds: number;
  framesAnalyzed: number;
}

export type RppgErrorCode = "FACE_NOT_DETECTED" | "LOW_QUALITY_VIDEO" | "INTERNAL_ERROR" | "TIMEOUT";

export class RppgError extends Error {
  constructor(public code: RppgErrorCode, message: string) {
    super(message);
    this.name = "RppgError";
  }
}
