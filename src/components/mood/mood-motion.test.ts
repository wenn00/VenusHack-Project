import { describe, expect, it } from "vitest";
import { MOOD_POSITIONS, moodOrbFrames, smoothMoodTrack } from "./mood-motion";

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

describe("continuous mood motion", () => {
  it("passes through the storyboard without overshooting any position, size, or opacity", () => {
    for (const mood of moods) {
      for (const chosen of [false, true]) {
        const frames = moodOrbFrames(mood, 326, chosen);
        for (const values of [frames.translateX, frames.translateY, frames.scale, frames.opacity]) {
          const track = smoothMoodTrack(values);
          expect(track.inputRange[0]).toBe(0);
          expect(track.inputRange.at(-1)).toBe(3);
          for (let index = 1; index < track.inputRange.length; index += 1) {
            expect(track.inputRange[index]).toBeGreaterThan(track.inputRange[index - 1]);
          }
          const keyframes = [0, 0.56, 1.8, 3];
          for (let segment = 0; segment < 3; segment += 1) {
            const start = track.inputRange.indexOf(keyframes[segment]);
            const end = track.inputRange.indexOf(keyframes[segment + 1]);
            expect(track.outputRange[start]).toBeCloseTo(values[segment]);
            for (const value of track.outputRange.slice(start, end + 1)) {
              expect(value).toBeGreaterThanOrEqual(Math.min(values[segment], values[segment + 1]) - 1e-9);
              expect(value).toBeLessThanOrEqual(Math.max(values[segment], values[segment + 1]) + 1e-9);
            }
          }
          expect(track.outputRange.at(-1)).toBeCloseTo(values[3]);
        }
      }
    }
  });

  it("carries movement through the gathering frame while delaying other colors' fade", () => {
    const frames = moodOrbFrames("good", 326, false);
    const track = smoothMoodTrack(frames.translateX, [0, 0.12, 1.8, 3]);
    const gather = track.inputRange.indexOf(1.8);
    const speedBefore = (track.outputRange[gather] - track.outputRange[gather - 1]) / (track.inputRange[gather] - track.inputRange[gather - 1]);
    const speedAfter = (track.outputRange[gather + 1] - track.outputRange[gather]) / (track.inputRange[gather + 1] - track.inputRange[gather]);
    expect(speedBefore).toBeGreaterThan(10);
    expect(speedAfter).toBeGreaterThan(10);
    expect(Math.abs(speedAfter - speedBefore) / speedBefore).toBeLessThan(0.12);
    const opacity = smoothMoodTrack(frames.opacity);
    opacity.outputRange.slice(0, opacity.inputRange.indexOf(1.8) + 1).forEach(value => expect(value).toBeCloseTo(1));
  });
});
