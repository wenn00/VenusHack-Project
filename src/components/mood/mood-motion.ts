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
export const MOOD_TIMING = { anticipate: 280, gather: 640, hold: 140, reveal: 460, notes: 260, return: 680 };

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
    scale: [1, chosen ? 1.38 : 1, 72 / 86.4, chosen ? 181.4 / 86.4 : 0.04],
    opacity: chosen ? [1, 1, 1, 1] : [1, 1, 1, 0],
  };
}
