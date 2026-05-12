"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * Theme toggle button — flips the `.dark` class on <html>, persists to
 * localStorage, and renders a sun/moon icon for the *target* theme (clicking
 * shows what you'd switch to).
 *
 * The initial theme is set by an inline script in <head> (layout.tsx) so the
 * page paints with the right palette before React hydrates. This component
 * just keeps state in sync after that.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Read from the DOM (set by themeInitScript) — not from localStorage,
    // so we stay consistent with what the user is actually seeing.
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  if (theme === null) {
    // Reserve space to prevent layout shift between SSR + hydration.
    return <div className="h-8 w-8" aria-hidden />;
  }

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("aw-theme", next);
    } catch {
      // ignored — private mode or storage disabled; the toggle still works for the session
    }
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const targetLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  const icon = theme === "dark" ? "☀️" : "🌙";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={targetLabel}
      title={targetLabel}
      className="flex h-8 w-8 items-center justify-center rounded-sm text-base transition-colors hover:bg-overlay/5"
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}
