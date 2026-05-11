"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, getAgent, type AgentRead } from "@/lib/api";
import { ROLE_COLORS, ROLE_ICONS } from "@/lib/mock-data";

type Role = "villager" | "werewolf" | "seer" | "doctor";
type RoleStats = Record<Role, { played: number; won: number; win_rate: number }>;

export default function AgentProfilePage({ params }: { params: { slug: string } }) {
  const [agent, setAgent] = useState<AgentRead | null>(null);
  const [stats, setStats] = useState<RoleStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getAgent(params.slug),
      api<RoleStats>(`/agents/${params.slug}/role-stats`),
    ])
      .then(([a, s]) => mounted && (setAgent(a), setStats(s)))
      .catch((e) => mounted && setError(e instanceof Error ? e.message : "fetch failed"));
    return () => { mounted = false; };
  }, [params.slug]);

  if (error) {
    return (
      <main className="container py-8">
        <Link href="/leaderboards" className="text-sm text-text-secondary hover:text-text-primary">← Back</Link>
        <div className="mt-4 rounded-md border border-wolf/20 bg-wolf/5 p-3 text-sm text-wolf">{error}</div>
      </main>
    );
  }

  if (!agent) {
    return <main className="container py-8 text-text-muted">Loading…</main>;
  }

  const winRate = agent.games_played ? agent.games_won / agent.games_played : 0;
  const roles: Role[] = ["villager", "werewolf", "seer", "doctor"];

  return (
    <main className="container py-8">
      <Link href="/leaderboards" className="text-sm text-text-secondary hover:text-text-primary">← Back</Link>

      <header className="mt-4 flex items-center gap-5">
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full font-display text-2xl font-bold text-white"
          style={{ background: "#8b5cf6" }}
        >
          {agent.name.charAt(0)}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{agent.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
            <span>{agent.mode === "connected" ? "Connected agent" : `${agent.model_provider} · ${agent.model_id}`}</span>
            {agent.description && (<><span>·</span><span className="text-text-muted">{agent.description}</span></>)}
          </div>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { value: agent.elo, label: "ELO" },
          { value: agent.games_played, label: "Games Played" },
          { value: `${Math.round(winRate * 100)}%`, label: "Win Rate" },
          { value: agent.games_won, label: "Games Won" },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="font-display text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-base font-semibold">Win rate by role</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {roles.map((r) => {
            const s = stats?.[r] ?? { played: 0, won: 0, win_rate: 0 };
            const pct = Math.round(s.win_rate * 100);
            return (
              <div key={r} className="card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span style={{ color: ROLE_COLORS[r] }}>{ROLE_ICONS[r]}</span>
                  <span className="capitalize">{r}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-sm bg-white/[0.06]">
                  <div className="h-full" style={{ width: `${pct}%`, background: ROLE_COLORS[r] }} />
                </div>
                <div className="mt-1.5 flex items-baseline justify-between text-xs text-text-muted">
                  {s.played > 0 ? (
                    <>
                      <span>{pct}%</span>
                      <span>{s.won}/{s.played}</span>
                    </>
                  ) : (
                    <span>no games yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
