import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#fbf9f8",
          dim: "#dcd9d9",
          bright: "#fbf9f8",
          low: "#f6f3f2",
          container: "#f0eded",
          high: "#eae8e7",
          highest: "#e4e2e1",
          lowest: "rgba(255, 255, 255, 0.8)",
        },
        primary: {
          DEFAULT: "#4d6359",
          container: "#8ca398",
          fixed: "#d0e8dc",
          "fixed-dim": "#b4ccc0",
        },
        secondary: {
          DEFAULT: "#6a5c4d",
          container: "#f0dcc9",
          fixed: "#f3dfcc",
          "fixed-dim": "#d6c3b1",
        },
        tertiary: {
          DEFAULT: "#615e57",
          container: "#a29d95",
          fixed: "#e8e2d9",
          "fixed-dim": "#cbc6bd",
        },
        outline: {
          DEFAULT: "#727875",
          variant: "#c2c8c4",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        "on-surface": "#1b1c1c",
        "on-surface-variant": "#424845",
        "on-primary": "#ffffff",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#6e6051",
        background: "#fbf9f8",
      },
      fontFamily: {
        manrope: ["Manrope", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
