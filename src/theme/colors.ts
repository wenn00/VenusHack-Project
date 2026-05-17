export const colors = {
  bg: {
    page: "#1750AC",
    pageDeep: "#003396",
    pageBright: "#2B8BFF",
    card: "rgba(255, 255, 255, 0.08)",
    muted: "rgba(255, 255, 255, 0.12)",
    input: "rgba(0, 51, 150, 0.16)",
    overlay: "rgba(0, 0, 0, 0.45)",
  },
  fg: {
    primary: "#FFFFFF",
    secondary: "rgba(255, 255, 255, 0.82)",
    muted: "rgba(255, 255, 255, 0.64)",
    placeholder: "rgba(255, 255, 255, 0.5)",
    onAccent: "#FFFFFF",
    onStatus: "#FFFFFF",
  },
  accent: {
    blue: "#003396",
    blueSoft: "rgba(0, 51, 150, 0.4)",
    blueLight: "#4FA0FF",
    rose: "#F27E9B",
    roseDark: "#FFFFFF",
    roseLight: "rgba(255, 255, 255, 0.18)",
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
    default: "rgba(255, 255, 255, 0.34)",
    strong: "rgba(255, 255, 255, 0.96)",
    faint: "rgba(255, 255, 255, 0.16)",
  },
} as const;

export type ColorTokens = typeof colors;
