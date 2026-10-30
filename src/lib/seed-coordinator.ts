/**
 * Coordinates demo seeding across overlapping UserDataContext refreshes.
 *
 * On web, auth-js re-parses the session on INITIAL_SESSION and on every
 * tab refocus, which hands UserDataContext a new `user` object and starts
 * another refresh. A refresh that ran while the seed was still writing used
 * to fetch the empty pre-seed rows, win the newest-refresh check and publish
 * them, so RootGate sent the demo visitor to onboarding. Every refresh now
 * waits for the in-flight seed, and the seed itself runs once per user.
 */

export interface SeedCoordinator {
  /** Resolves once any seed running for this user has finished (or failed). */
  settled(userId: string): Promise<void>;
  /** Runs `seed` unless it already ran or is running for this user. */
  runOnce(userId: string, seed: () => Promise<void>): Promise<void>;
  /** Forget the seed (sign-out or account switch). */
  reset(): void;
}

export function createSeedCoordinator(): SeedCoordinator {
  let current: { userId: string; promise: Promise<void> } | null = null;

  return {
    settled(userId) {
      if (current?.userId !== userId) return Promise.resolve();
      // A failed seed is logged by its caller; it must not block later loads.
      return current.promise.catch(() => undefined);
    },
    runOnce(userId, seed) {
      if (current?.userId !== userId) {
        current = { userId, promise: seed() };
      }
      return current.promise;
    },
    reset() {
      current = null;
    },
  };
}
