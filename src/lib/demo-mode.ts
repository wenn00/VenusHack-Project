/**
 * Conference demo mode.
 *
 * The public web build sets EXPO_PUBLIC_DEMO_MODE=true, which shows the
 * "Try the demo" entry on the login screen. Native builds leave it unset.
 * The env var must be read with this exact static expression so Expo can
 * inline it at build time.
 */

export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === "true";

/** What /demo should do for the session it finds on arrival. */
export function demoEntryAction(
  session: { user: { is_anonymous?: boolean } } | null,
): "sign_in" | "continue" {
  return session ? "continue" : "sign_in";
}
