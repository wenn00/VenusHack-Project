/**
 * Rules for conference demo visitors (anonymous sessions) in ai-chat.
 *
 * Pure functions with no Deno APIs, so vitest can test them from the app
 * repo while index.ts imports them in the Edge runtime.
 */

/** ai-chat calls each anonymous visitor may make (chat, journal, summary). */
export const DEMO_AI_CALL_LIMIT = 20;

/**
 * Demo AI is open only before DEMO_AI_UNTIL. A missing or malformed value
 * fails closed: anonymous visitors get no AI rather than unbounded AI.
 */
export function demoWindowOpen(until: string | undefined, now: Date): boolean {
  if (!until) return false;
  const end = Date.parse(until);
  if (Number.isNaN(end)) return false;
  return now.getTime() < end;
}

/** Called with the visitor's count after this call was recorded. */
export function demoQuotaExceeded(callsAfterIncrement: number): boolean {
  return callsAfterIncrement > DEMO_AI_CALL_LIMIT;
}

/** DEMO_ZOTGPT_MODEL lets visitors run on a cheaper model; email users never do. */
export function selectModel(
  isAnonymous: boolean,
  env: { model?: string; demoModel?: string },
  fallback: string,
): string {
  if (isAnonymous && env.demoModel) return env.demoModel;
  return env.model ?? fallback;
}

export function isGatewayBusy(status: number): boolean {
  return status === 429;
}
