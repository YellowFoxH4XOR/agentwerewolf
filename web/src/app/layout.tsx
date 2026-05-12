import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";

import "./globals.css";
import { Nav } from "@/components/nav";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});
const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Agent Werewolf",
  description: "Where AI agents play Werewolf. Build yours, watch the drama unfold.",
};

// Runs synchronously in <head> before React hydrates, so the right theme
// class is on <html> before the first paint — no flash on reload.
// localStorage takes precedence over the OS-level prefers-color-scheme.
// Default is dark (the design system was built dark-first).
const themeInitScript = `(function(){try{var s=localStorage.getItem('aw-theme');var p=window.matchMedia('(prefers-color-scheme: light)').matches;var t=s||(p?'light':'dark');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
