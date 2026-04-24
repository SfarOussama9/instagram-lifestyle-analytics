import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FBF7F4",
        panel: "#FFFFFF",
        panelSoft: "#FAF5F1",
        borderSoft: "rgba(17,17,27,0.08)",
        hairline: "rgba(17,17,27,0.08)",
        // Legacy aliases remapped to the Instagram palette to minimize churn.
        acid: "#DD2A7B",
        lilac: "#8134AF",
        igOrange: "#F58529",
        igPink: "#DD2A7B",
        igPurple: "#8134AF",
        igCyan: "#4FC3E8",
        igPeach: "#FFD4B5",
        ink: "#141420",
        inkSoft: "#3C3C4A",
        muted: "#7A7A88",
      },
      boxShadow: {
        glow: "0 24px 80px rgba(221, 42, 123, 0.14)",
        card: "0 10px 40px -12px rgba(17,17,27,0.12)",
        cardSoft: "0 4px 20px -8px rgba(221,42,123,0.18)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(17,17,27,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,27,0.04) 1px, transparent 1px)",
        igGradient: "linear-gradient(135deg, #F58529 0%, #DD2A7B 52%, #8134AF 100%)",
        igSoft: "linear-gradient(135deg, rgba(245,133,41,0.12), rgba(221,42,123,0.14) 55%, rgba(129,52,175,0.14))",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
