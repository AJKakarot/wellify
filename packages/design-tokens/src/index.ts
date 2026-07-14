export const designTokens = {
  colors: {
    background: "#fbf9f8",
    surface: "#fbf9f8",
    surfaceLow: "#f6f3f2",
    surfaceHigh: "#eae8e7",
    surfaceHighest: "#e4e2e1",
    surfaceLowest: "#ffffff",
    text: "#1b1c1c",
    muted: "#424845",
    outline: "#727875",
    outlineVariant: "#c2c8c4",
    primary: "#4d6359",
    primarySoft: "#8ca398",
    primaryFixed: "#d0e8dc",
    secondary: "#6a5c4d",
    secondarySoft: "#f3dfcc",
    secondaryContainer: "#f0dcc9",
    warning: "#ba1a1a",
    accent: "#4d6359",
    accentSoft: "#d0e8dc",
  },
  radius: {
    input: 14,
    card: 22,
    hero: 30,
    pill: 999,
  },
  shadow: {
    ambient: {
      shadowColor: "#1b1c1c",
      shadowOpacity: 0.06,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 16 },
      elevation: 3,
    },
  },
} as const;

export const apiModules = [
  {
    title: "Logging",
    description: "Text logs, voice notes, water, exercise, and weight entries.",
  },
  {
    title: "Meals",
    description: "Photo meals, manual meals, revision history, and nutrition rollups.",
  },
  {
    title: "Coach",
    description: "Grounded AI chat, weekly insights, and goal recommendations.",
  },
  {
    title: "Progress",
    description: "Day and week dashboards, adherence scoring, and trend tracking.",
  },
] as const;
