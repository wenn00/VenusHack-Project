import { describe, expect, it } from "vitest";
import { MOOD_POSITIONS, MOOD_TIMING, moodMenuVisible, moodOrbFrames, smoothMoodTrack } from "./mood-motion";

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
        expect(frames.opacity.slice(0, 4)).toEqual([1, 1, 1, 1]);
        expect(frames.scale[2]).toBeLessThan(1);
        expect(center(3).x).toBeCloseTo(width / 2);
        expect(center(3).y).toBeCloseTo(109);
        expect(frames.scale[3]).toBeLessThan(0.1);
        expect(center(4)).toEqual(center(3));
        expect(frames.size * frames.scale[3]).toBeLessThan(4);
        expect(frames.opacity[4]).toBe(0);
      }
    });

    it(`enlarges any chosen color first, shrinks with the group, then remains visible at width ${width}`, () => {
      for (const mood of moods) {
        const frames = moodOrbFrames(mood, width, true);
        expect(frames.scale[1]).toBeGreaterThan(frames.scale[0]);
        expect(frames.translateX[1]).toBe(0);
        expect(frames.translateY[1]).toBe(0);
        expect(frames.scale[2]).toBeLessThan(frames.scale[0]);
        expect(frames.size * frames.scale[3]).toBeLessThan(4);
        expect(frames.scale[4]).toBeGreaterThan(frames.scale[1]);
        expect(frames.opacity).toEqual([1, 1, 1, 1, 1]);
        expect(frames.size * frames.scale[4]).toBeCloseTo(181.4 * width / 333.6);
      }
    });
  }
});

describe("continuous mood motion", () => {
  it("returns through the same point at the same pace without another anticipation pulse", () => {
    expect(MOOD_TIMING.return).toBe(MOOD_TIMING.select);
    for (const mood of moods) {
      const forward = moodOrbFrames(mood, 326, true);
      const returning = moodOrbFrames(mood, 326, true, true);
      expect(returning.translateX).toEqual(forward.translateX);
      expect(returning.translateY).toEqual(forward.translateY);
      expect(returning.scale.slice(2)).toEqual(forward.scale.slice(2));
      const track = smoothMoodTrack(returning.scale);
      // Near home the light grows steadily to its resting size, never past it.
      const home = track.outputRange.slice(0, track.inputRange.indexOf(1.52) + 1).reverse();
      for (let index = 1; index < home.length; index += 1) {
        expect(home[index]).toBeGreaterThanOrEqual(home[index - 1] - 1e-9);
        expect(home[index]).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it("opens gently from the central point and settles without a sudden size change", () => {
    const frames = moodOrbFrames("good", 334, true);
    const track = smoothMoodTrack(frames.scale);
    const point = track.inputRange.indexOf(2.16);
    const millisecondsPerUnit = MOOD_TIMING.select / 4;
    const diameterAt = (time: number) => {
      const index = track.inputRange.findIndex(value => value >= time);
      const previous = Math.max(0, index - 1);
      const fraction = (time - track.inputRange[previous]) / (track.inputRange[index] - track.inputRange[previous]);
      return frames.size * (track.outputRange[previous] + fraction * (track.outputRange[index] - track.outputRange[previous]));
    };
    expect(diameterAt(2.16 + 80 / millisecondsPerUnit) - frames.size * frames.scale[3]).toBeLessThan(1);
    expect(frames.size * frames.scale[4] - diameterAt(4 - 80 / millisecondsPerUnit)).toBeLessThan(1);
    const speeds = track.outputRange.slice(point + 1).map((value, offset) => {
      const index = point + offset + 1;
      return frames.size * (value - track.outputRange[index - 1]) / ((track.inputRange[index] - track.inputRange[index - 1]) * millisecondsPerUnit / 1000);
    });
    expect(Math.max(...speeds)).toBeLessThan(320);
  });

  it("passes through the storyboard without overshooting any position, size, or opacity", () => {
    for (const mood of moods) {
      for (const chosen of [false, true]) {
        const frames = moodOrbFrames(mood, 326, chosen);
        for (const values of [frames.translateX, frames.translateY, frames.scale, frames.opacity]) {
          const track = smoothMoodTrack(values);
          expect(track.inputRange[0]).toBe(0);
          expect(track.inputRange.at(-1)).toBe(4);
          for (let index = 1; index < track.inputRange.length; index += 1) {
            expect(track.inputRange[index]).toBeGreaterThan(track.inputRange[index - 1]);
          }
          const keyframes = [0, 0.48, 1.52, 2.16, 4];
          for (let segment = 0; segment < 4; segment += 1) {
            const start = track.inputRange.indexOf(keyframes[segment]);
            const end = track.inputRange.indexOf(keyframes[segment + 1]);
            expect(track.outputRange[start]).toBeCloseTo(values[segment]);
            for (const value of track.outputRange.slice(start, end + 1)) {
              expect(value).toBeGreaterThanOrEqual(Math.min(values[segment], values[segment + 1]) - 1e-9);
              expect(value).toBeLessThanOrEqual(Math.max(values[segment], values[segment + 1]) + 1e-9);
            }
          }
          expect(track.outputRange.at(-1)).toBeCloseTo(values[4]);
        }
      }
    }
  });

  it("carries movement through the gathering frame while delaying other colors' fade", () => {
    const frames = moodOrbFrames("good", 326, false);
    const track = smoothMoodTrack(frames.translateX, [0, 0.1, 1.52, 2.16, 4]);
    const gather = track.inputRange.indexOf(1.52);
    const speedBefore = (track.outputRange[gather] - track.outputRange[gather - 1]) / (track.inputRange[gather] - track.inputRange[gather - 1]);
    const speedAfter = (track.outputRange[gather + 1] - track.outputRange[gather]) / (track.inputRange[gather + 1] - track.inputRange[gather]);
    expect(speedBefore).toBeGreaterThan(10);
    expect(speedAfter).toBeGreaterThan(10);
    expect(Math.abs(speedAfter - speedBefore) / speedBefore).toBeLessThan(0.12);
    const opacity = smoothMoodTrack(frames.opacity);
    opacity.outputRange.slice(0, opacity.inputRange.indexOf(2.16) + 1).forEach(value => expect(value).toBeCloseTo(1));
  });
});

describe("floating menu during the mood flow", () => {
  it("steps aside while the note form is open", () => {
    expect(moodMenuVisible("selected")).toBe(false);
  });

  it("stays available while choosing and through both transitions", () => {
    expect((["choosing", "selecting", "returning"] as const).map(moodMenuVisible)).toEqual([true, true, true]);
  });
});
