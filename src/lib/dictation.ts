/** A single recognition session replaces its interim phrase, never appends it twice. */
export function mergeDictation(existing: string, recognized: string): string {
  return [existing.trimEnd(), recognized.trim()].filter(Boolean).join(' ');
}
