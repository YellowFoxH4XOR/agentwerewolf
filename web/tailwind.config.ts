import type { Config } from "tailwindcss";

// Theme-aware palette. Chrome colors (bg, text, border, overlay) flow through
// CSS vars defined in globals.css and swap between :root (light) and :root.dark
// (dark). Semantic game colors (night/day/vote bg, role colors) stay static —
// they represent gameplay state and are recognized across themes.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.75rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        // App chrome — theme-aware via CSS vars. `<alpha-value>` lets `bg-bg-card/50`
        // etc. still work; that's why the var holds "R G B" channels, not a full rgb().
        bg: {
          deep:      "rgb(var(--bg-deep) / <alpha-value>)",
          main:      "rgb(var(--bg-main) / <alpha-value>)",
          surface:   "rgb(var(--bg-surface) / <alpha-value>)",
          card:      "rgb(var(--bg-card) / <alpha-value>)",
          cardHover: "rgb(var(--bg-card-hover) / <alpha-value>)",
          // Game-state semantics: kept static. "Night phase" should feel dark
          // even when the user's app theme is light.
          night:   "#08082a",
          day:     "#18140a",
          vote:    "#1a0f08",
        },
        text: {
          primary:   "rgb(var(--text-primary) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          muted:     "rgb(var(--text-muted) / <alpha-value>)",
        },
        // Brand + role colors stay static across themes.
        accent: {
          DEFAULT: "#8b5cf6",
          dim:     "#6d28d9",
        },
        amber:    { DEFAULT: "#f59e0b" },
        wolf:     { DEFAULT: "#ef4444" },
        seer:     { DEFAULT: "#818cf8" },
        doctor:   { DEFAULT: "#2dd4bf" },
        villager: { DEFAULT: "#4ade80" },
        border: {
          // Already-baked alpha; no opacity-utility usage anywhere.
          DEFAULT: "var(--border)",
          active:  "var(--border-active)",
        },
        // Semantic hover overlay: white-tinted in dark mode, black-tinted in light.
        // Use `bg-overlay/5`, `hover:bg-overlay/10`, etc. — they invert automatically.
        overlay: "rgb(var(--overlay) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { sm: "8px", md: "12px", lg: "16px", xl: "20px" },
      keyframes: {
        fadeIn:     { "0%": { opacity: "0", transform: "translateY(8px)" },  "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeInUp:   { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pulse:      { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        float:      { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
        breathe:    { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.02)" } },
        twinkle:    { "0%,100%": { opacity: "0.3" }, "50%": { opacity: "1" } },
        slideRight: { "0%": { opacity: "0", transform: "translateX(20px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        phaseReveal:{ "0%": { opacity: "0", transform: "scale(0.8)" },       "100%": { opacity: "1", transform: "scale(1)" } },
      },
      animation: {
        "fade-in":     "fadeIn 0.4s ease both",
        "fade-in-up":  "fadeInUp 0.6s ease both",
        "pulse-soft":  "pulse 1.5s ease-in-out infinite",
        "float":       "float 4s ease-in-out infinite",
        "breathe":     "breathe 2s ease-in-out infinite",
        "twinkle":     "twinkle 3s ease-in-out infinite",
        "slide-right": "slideRight 0.4s ease both",
        "phase-reveal":"phaseReveal 0.6s ease both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
