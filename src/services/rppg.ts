/**
 * rPPG service.
 *
 * Uploads a short face video to the Python FastAPI backend and
 * returns BPM + HRV + confidence. See docs/07-rppg-plan.md.
 */

import { RppgError, RppgResult } from "@/types";

const BASE_URL = process.env.EXPO_PUBLIC_RPPG_API_URL;
// Generous enough to cover a cold-started Render free-tier dyno
// plus MediaPipe processing on a 0.1-CPU instance.
const REQUEST_TIMEOUT_MS = 90000;

export async function measureRppg(videoUri: string): Promise<RppgResult> {
  if (!BASE_URL) {
    throw new RppgError("INTERNAL_ERROR", "Missing EXPO_PUBLIC_RPPG_API_URL");
  }

  const formData = new FormData();
  // React Native FormData accepts this object shape for files.
  formData.append("video", {
    uri: videoUri,
    type: "video/mp4",
    name: "rppg.mp4",
  } as unknown as Blob);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/measure`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new RppgError("TIMEOUT", "Measurement request timed out");
    }
    throw new RppgError("INTERNAL_ERROR", (err as Error).message);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail = "Server error";
    try {
      const body = await response.json();
      detail = body.message ?? detail;
    } catch {
      // Ignore JSON parse errors.
    }
    throw new RppgError("INTERNAL_ERROR", detail);
  }

  const data = (await response.json()) as {
    status: string;
    bpm: number;
    hrv_ms: number;
    confidence: number;
    duration_seconds: number;
    frames_analyzed: number;
  };

  return {
    bpm: data.bpm,
    hrvMs: data.hrv_ms,
    confidence: data.confidence,
    durationSeconds: data.duration_seconds,
    framesAnalyzed: data.frames_analyzed,
  };
}

/**
 * Warm up the Render free-tier server before demo so the first real
 * request does not hit a 30-second cold start.
 */
export async function pingRppg(): Promise<boolean> {
  if (!BASE_URL) return false;
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
