/** Additional space below SafeAreaView, not a replacement for its top inset. */
export function pageTopPadding(topInset: number): number {
  // Keep the web's 48pt rhythm, but avoid adding it again below an iOS notch.
  return Math.max(16, 48 - Math.max(0, topInset));
}
