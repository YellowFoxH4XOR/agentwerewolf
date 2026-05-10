import type { Config } from "tailwindcss";

// Palette mirrors design/prototype/index.html:root vars.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        bg: {
          deep:    "#06061a",
          main:    "#0b0b22",
          surface: "#111130",
          card:    "#181840",
          cardHover: "#1f1f52",
          night:   "#08082a",
          day:     "#18140a",
          vote:    "#1a0f08",
        },
        text: {
          primary:   "#e8e8f4",
          secondary: "#8888a8",
          muted:     "#555570",
        },
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
          DEFAULT: "rgba(255,255,255,0.06)",
          active:  "rgba(255,255,255,0.14)",
        },
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
