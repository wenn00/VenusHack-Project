/**
 * ai-chat error codes whose meaning is safe — and useful — to show users.
 * Every other code stays generic so provider details never reach patients.
 */

const MESSAGES: Record<string, string> = {
  anonymous_not_allowed: "AI features need an email sign-in. Sign out and sign in with your email to use them.",
  demo_closed: "The demo's AI is closed now. Thanks for trying Kairos!",
  demo_quota_exhausted: "You've reached the demo's AI limit. Thanks for trying Kairos!",
  ai_busy: "The AI is busy right now. Please try again in a moment.",
};

export function userFacingAiMessage(code: string): string | null {
  return MESSAGES[code] ?? null;
}
