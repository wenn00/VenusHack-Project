/** Figma frames 126:1453 → 133:2211 → 133:2258, in the 333.6px cluster. */
export const MOOD_POSITIONS = {
  great: { x: 123.6, y: 0, gatheredX: 169, gatheredY: 68 },
  good: { x: 0, y: 100.8, gatheredX: 141, gatheredY: 91 },
  okay: { x: 247.2, y: 99.6, gatheredX: 208, gatheredY: 104 },
  low: { x: 51.6, y: 230.4, gatheredX: 147, gatheredY: 128 },
  bad: { x: 206.4, y: 231.6, gatheredX: 181, gatheredY: 140 },
} as const;

// The file has static storyboard frames, not exported keyframes. These timings
// implement the user's requested swell → gather → central point → reveal.
export const MOOD_TIMING = { select: 2400, notes: 420, return: 2400 };
export const MOOD_KEYFRAMES = [0, 0.48, 1.52, 2.16, 4];
export const MOOD_POINT = MOOD_KEYFRAMES[3];
const CURVE_SAMPLES_PER_SEGMENT = 48;

/** Sample a quintic curve for native Animated interpolation. Shared tangents
 * and zero acceleration at anchors soften the reversal at the central point.
 * The one linear animation clock drives these curves in either direction. */
export function smoothMoodTrack(values: number[], times = MOOD_KEYFRAMES) {
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
      const t4 = t3 * t;
      const t5 = t4 * t;
      const delta = values[index + 1] - values[index];
      const startVelocity = span * tangents[index];
      const endVelocity = span * tangents[index + 1];
      inputRange.push(step === CURVE_SAMPLES_PER_SEGMENT ? times[index + 1] : times[index] + t * span);
      outputRange.push(
        values[index] + startVelocity * t
        + (10 * delta - 6 * startVelocity - 4 * endVelocity) * t3
        + (-15 * delta + 8 * startVelocity + 7 * endVelocity) * t4
        + (6 * delta - 3 * startVelocity - 3 * endVelocity) * t5,
      );
    }
  }
  return { inputRange, outputRange, extrapolate: "clamp" as const };
}

export function moodOrbFrames(mood: keyof typeof MOOD_POSITIONS, width: number, chosen: boolean, returning = false) {
  const position = MOOD_POSITIONS[mood];
  const ratio = width / 333.6;
  const size = 86.4 * ratio;
  const x = position.x * ratio;
  const y = position.y * ratio;
  const finalX = width / 2 - size / 2;
  const finalY = 109 - size / 2;
  return {
    size, x, y,
    // All colors reach the same small point before any fade away. The chosen
    // light grows out of that point; the others stay there while disappearing.
    translateX: [0, 0, position.gatheredX * ratio - size / 2 - x, finalX - x, finalX - x],
    translateY: [0, 0, position.gatheredY * ratio - size / 2 - y, finalY - y, finalY - y],
    // Anticipation belongs to the forward tap, not to the end of the return.
    scale: [1, chosen && !returning ? 1.32 : 1, 72 / 86.4, 0.04, chosen ? 181.4 / 86.4 : 0.01],
    opacity: chosen ? [1, 1, 1, 1, 1] : [1, 1, 1, 1, 0],
  };
}
