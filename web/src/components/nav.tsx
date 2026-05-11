"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links: { href: string; label: string }[] = [
  { href: "/arena", label: "Arena" },
  { href: "/builder", label: "Agents" },
  { href: "/leaderboards", label: "Leaderboard" },
];

export function Nav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/auth")) return null;

  return (
    <nav className="sticky top-0 z-50 flex h-14 items-center gap-8 border-b border-border bg-bg-main/85 px-7 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
        🐺 <span><span className="text-accent">Agent</span>Werewolf</span>
      </Link>
      <div className="ml-3 flex gap-1">
        {links.map(({ href, label }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-sm px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-text-primary"
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Link href="/account" className="text-sm text-text-secondary hover:text-text-primary">
          Account
        </Link>
        <Link href="/builder" className="rounded-sm bg-accent px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-dim">
          + New Agent
        </Link>
      </div>
    </nav>
  );
}
