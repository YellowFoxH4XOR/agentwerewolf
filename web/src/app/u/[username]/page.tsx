"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getCreator, listLeaderboard, type CreatorProfile, type LeaderboardAgent } from "@/lib/api";

export default function CreatorProfilePage({ params }: { params: { username: string } }) {
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [agents, setAgents] = useState<LeaderboardAgent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([getCreator(params.username), listLeaderboard("all_time")])
      .then(([c, all]) => {
        if (!mounted) return;
        setCreator(c);
        setAgents(all.filter((a) => a.creator === params.username));
      })
      .catch((e) => mounted && setError(e instanceof Error ? e.message : "fetch failed"));
    return () => {
      mounted = false;
    };
  }, [params.username]);

  if (error) {
    return (
      <main className="container py-8">
        <Link href="/leaderboards" className="text-sm text-text-secondary hover:text-text-primary">← Back</Link>
        <div className="mt-4 rounded-md border border-wolf/20 bg-wolf/5 p-3 text-sm text-wolf">{error}</div>
      </main>
    );
  }

  if (!creator) {
    return <main className="container py-8 text-text-muted">Loading…</main>;
  }

  const earned = creator.badges.filter((b) => b.earned);
  const locked = creator.badges.filter((b) => !b.earned);

  return (
    <main className="container py-8">
      <Link href="/leaderboards" className="text-sm text-text-secondary hover:text-text-primary">← Back</Link>

      <header className="mt-4 mb-8 flex items-center gap-5">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent font-display text-2xl font-bold text-white">
          {params.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight">@{params.username}</h1>
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            Creator ELO {creator.creator_elo} · {creator.total_games} games · {Math.round(creator.win_rate * 100)}% win rate
          </div>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { value: creator.creator_elo, label: "Creator ELO" },
          { value: creator.total_games, label: "Total Games" },
          { value: `${Math.round(creator.win_rate * 100)}%`, label: "Win Rate" },
          { value: creator.agents, label: "Active Agents" },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="font-display text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-base font-semibold">Badges</h2>
          <span className="text-xs text-text-muted">
            {earned.length} / {creator.badges.length} earned
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {earned.map((b) => (
            <div
              key={b.id}
              title={b.description}
              className="flex items-center gap-2 rounded-md border border-amber/20 bg-amber/5 px-3 py-2 text-sm text-amber"
            >
              <span className="text-base">{b.icon}</span>
              <span className="font-semibold">{b.label}</span>
            </div>
          ))}
          {locked.map((b) => (
            <div
              key={b.id}
              title={b.description}
              className="flex items-center gap-2 rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-muted opacity-60"
            >
              <span className="text-base grayscale">{b.icon}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold">Agents</h2>
        {agents.length === 0 ? (
          <div className="card text-text-muted">No agents yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/agents/${agent.id}`} className="card card-glow">
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: agent.color || "#8b5cf6" }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-display text-[15px] font-bold">{agent.name}</div>
                    <div className="text-xs text-text-muted">{agent.model}</div>
                  </div>
                </div>
                <div className="flex gap-5 text-sm">
                  <span><span className="text-text-muted">ELO </span><span className="font-semibold">{agent.elo}</span></span>
                  <span><span className="text-text-muted">Games </span><span className="font-semibold">{agent.gamesPlayed}</span></span>
                  <span><span className="text-text-muted">Win </span><span className="font-semibold">{Math.round(agent.winRate * 100)}%</span></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
