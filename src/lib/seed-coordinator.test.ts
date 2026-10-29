import { describe, expect, it } from "vitest";
import { createSeedCoordinator } from "./seed-coordinator";

function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createSeedCoordinator", () => {
  it("runs the seed once when two refreshes ask for it at the same time", async () => {
    const coordinator = createSeedCoordinator();
    const gate = deferred();
    let runs = 0;
    const seed = () => {
      runs += 1;
      return gate.promise;
    };
    const first = coordinator.runOnce("u1", seed);
    const second = coordinator.runOnce("u1", seed);
    gate.resolve();
    await Promise.all([first, second]);
    expect(runs).toBe(1);
  });

  it("makes a refresh wait for a seed that is still running", async () => {
    // Regression: a second refresh (tab refocus, session re-parse) skipped
    // the in-flight seed, fetched the empty pre-seed rows and published them,
    // so RootGate sent the demo visitor to onboarding.
    const coordinator = createSeedCoordinator();
    const gate = deferred();
    void coordinator.runOnce("u1", () => gate.promise);

    let settled = false;
    void coordinator.settled("u1").then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(false);

    gate.resolve();
    await flush();
    expect(settled).toBe(true);
  });

  it("does not hold up refreshes for another user", async () => {
    const coordinator = createSeedCoordinator();
    void coordinator.runOnce("u1", () => deferred().promise);
    let settled = false;
    void coordinator.settled("u2").then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(true);
  });

  it("lets refreshes continue after a seed failed", async () => {
    const coordinator = createSeedCoordinator();
    const gate = deferred();
    const run = coordinator.runOnce("u1", () => gate.promise);
    gate.reject(new Error("insert failed"));
    await expect(run).rejects.toThrow("insert failed");
    await expect(coordinator.settled("u1")).resolves.toBeUndefined();
  });

  it("does not seed the same user again after the seed finished", async () => {
    const coordinator = createSeedCoordinator();
    let runs = 0;
    await coordinator.runOnce("u1", async () => {
      runs += 1;
    });
    await coordinator.runOnce("u1", async () => {
      runs += 1;
    });
    expect(runs).toBe(1);
  });

  it("seeds again after a reset (sign-out, then a new demo session)", async () => {
    const coordinator = createSeedCoordinator();
    let runs = 0;
    const seed = async () => {
      runs += 1;
    };
    await coordinator.runOnce("u1", seed);
    coordinator.reset();
    await coordinator.runOnce("u1", seed);
    expect(runs).toBe(2);
  });
});
