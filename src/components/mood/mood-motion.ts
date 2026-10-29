/** Figma frames 126:1453 → 133:2211 → 133:2258, in the 333.6px cluster. */
export const MOOD_POSITIONS = {
  great: { x: 123.6, y: 0, gatheredX: 169, gatheredY: 68 },
  good: { x: 0, y: 100.8, gatheredX: 141, gatheredY: 91 },
  okay: { x: 247.2, y: 99.6, gatheredX: 208, gatheredY: 104 },
  low: { x: 51.6, y: 230.4, gatheredX: 147, gatheredY: 128 },
  bad: { x: 206.4, y: 231.6, gatheredX: 181, gatheredY: 140 },
} as const;

// The file has static storyboard frames, not exported keyframes. These timings
// implement the user's requested anticipation → gathering → reveal sequence.
export const MOOD_TIMING = { select: 1680, notes: 320, return: 900 };
const CURVE_SAMPLES_PER_SEGMENT = 48;

/** Sample a monotone cubic curve for native Animated interpolation. Shared
 * tangents carry velocity across frames without overshooting position/opacity.
 * The one linear animation clock drives these curves in either direction. */
export function smoothMoodTrack(values: number[], times = [0, 0.56, 1.8, 3]) {
  const slopes = values.slice(1).map((value, index) => (value - values[index]) / (times[index + 1] - times[index]));
  const tangents = values.map((_, index) => {
    if (index === 0 || index === values.length - 1 || slopes[index - 1] * slopes[index] <= 0) return 0;
    const before = times[index] - times[index - 1];
    const after = times[index + 1] - times[index];
    const firstWeight = 2 * after + before;
    const secondWeight = after + 2 * before;
    return (firstWeight + secondWeight) / (firstWeight / slopes[index - 1] + secondWeight / slopes[index]);
  });
  const inputRange = [times[0]];
  const outputRange = [values[0]];
  for (let index = 0; index < values.length - 1; index += 1) {
    const span = times[index + 1] - times[index];
    for (let step = 1; step <= CURVE_SAMPLES_PER_SEGMENT; step += 1) {
      const t = step / CURVE_SAMPLES_PER_SEGMENT;
      const t2 = t * t;
      const t3 = t2 * t;
      inputRange.push(step === CURVE_SAMPLES_PER_SEGMENT ? times[index + 1] : times[index] + t * span);
      outputRange.push(
        (2 * t3 - 3 * t2 + 1) * values[index]
        + (t3 - 2 * t2 + t) * span * tangents[index]
        + (-2 * t3 + 3 * t2) * values[index + 1]
        + (t3 - t2) * span * tangents[index + 1],
      );
    }
  }
  return { inputRange, outputRange, extrapolate: "clamp" as const };
}

export function moodOrbFrames(mood: keyof typeof MOOD_POSITIONS, width: number, chosen: boolean) {
  const position = MOOD_POSITIONS[mood];
  const ratio = width / 333.6;
  const size = 86.4 * ratio;
  const x = position.x * ratio;
  const y = position.y * ratio;
  const finalX = width / 2 - size / 2;
  const finalY = 109 - size / 2;
  return {
    size, x, y,
    // Keep all five visible until the compact Rendering frame has been reached.
    translateX: [0, 0, position.gatheredX * ratio - size / 2 - x, finalX - x],
    translateY: [0, 0, position.gatheredY * ratio - size / 2 - y, finalY - y],
    scale: [1, chosen ? 1.32 : 1, 72 / 86.4, chosen ? 181.4 / 86.4 : 0.04],
    opacity: chosen ? [1, 1, 1, 1] : [1, 1, 1, 0],
  };
}
