import { describe, expect, it } from "vitest";
import { MOOD_POSITIONS, moodOrbFrames } from "./mood-motion";

const moods = Object.keys(MOOD_POSITIONS) as (keyof typeof MOOD_POSITIONS)[];

describe("mood selection storyboard", () => {
  for (const width of [256, 326, 334]) {
    it(`gathers all five visible colors before revealing one at width ${width}`, () => {
      for (const mood of moods) {
        const frames = moodOrbFrames(mood, width, false);
        const center = (stage: number) => ({
          x: frames.x + frames.translateX[stage] + frames.size / 2,
          y: frames.y + frames.translateY[stage] + frames.size / 2,
        });
        const distance = (stage: number) => Math.hypot(center(stage).x - width / 2, center(stage).y - 109);
        expect(distance(2)).toBeLessThan(distance(0));
        expect(frames.opacity.slice(0, 3)).toEqual([1, 1, 1]);
        expect(frames.scale[2]).toBeLessThan(1);
        expect(center(3).x).toBeCloseTo(width / 2);
        expect(center(3).y).toBeCloseTo(109);
        expect(frames.scale[3]).toBeLessThan(0.1);
        expect(frames.opacity[3]).toBe(0);
      }
    });

    it(`enlarges any chosen color first, shrinks with the group, then remains visible at width ${width}`, () => {
      for (const mood of moods) {
        const frames = moodOrbFrames(mood, width, true);
        expect(frames.scale[1]).toBeGreaterThan(frames.scale[0]);
        expect(frames.translateX[1]).toBe(0);
        expect(frames.translateY[1]).toBe(0);
        expect(frames.scale[2]).toBeLessThan(frames.scale[0]);
        expect(frames.scale[3]).toBeGreaterThan(frames.scale[1]);
        expect(frames.opacity).toEqual([1, 1, 1, 1]);
        expect(frames.size * frames.scale[3]).toBeCloseTo(181.4 * width / 333.6);
      }
    });
  }
});
