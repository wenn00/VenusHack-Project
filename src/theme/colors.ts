/**
 * Color palette for Kairos.
 * Placeholder values — replace with designer tokens when ready.
 *
 * Naming convention:
 *   - `bg.*` : background surfaces
 *   - `fg.*` : foreground / text
 *   - `accent.*` : interactive elements (brand pink/rose)
 *   - `status.*` : KPIN levels and feedback
 */

export const colors = {
  bg: {
    page: "#FFF7F5",
    card: "#FFFFFF",
    muted: "#FAEFEC",
    overlay: "rgba(0, 0, 0, 0.45)",
  },
  fg: {
    primary: "#2A1A1F",
    secondary: "#5A4750",
    muted: "#8C7C84",
    onAccent: "#FFFFFF",
    onStatus: "#FFFFFF",
  },
  accent: {
    rose: "#D97A8C",
    roseDark: "#B85F71",
    roseLight: "#F8D4DC",
  },
  status: {
    green: "#5BAF7C",
    greenBg: "#E5F4EA",
    yellow: "#E0A93D",
    yellowBg: "#FAEFD2",
    red: "#D8584A",
    redBg: "#F7DDD8",
  },
  border: {
    default: "#EFE0DC",
    strong: "#D6BFB8",
  },
} as const;

export type ColorTokens = typeof colors;
