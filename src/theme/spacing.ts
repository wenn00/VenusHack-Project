/**
 * Spacing and radius tokens.
 * Base unit is 4px. Use semantic names so screens stay consistent
 * even when designer adjusts the actual values.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;
