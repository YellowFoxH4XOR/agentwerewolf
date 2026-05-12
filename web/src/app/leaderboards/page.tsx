"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listLeaderboard, type LeaderboardAgent } from "@/lib/api";
import { cn } from "@/lib/utils";

type Tab = "all_time" | "this_week";

const FALLBACK_COLORS = [
  "#8b5cf6", "#f59e0b", "#a78bfa", "#f472b6", "#3b82f6", "#78716c",
  "#ec4899", "#6366f1", "#94a3b8", "#14b8a6", "#a3e635", "#fbbf24",
];

export default function LeaderboardsPage() {
  const [tab, setTab] = useState<Tab>("all_time");
  const [agents, setAgents] = useState<LeaderboardAgent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setAgents(null);
    listLeaderboard(tab)
      .then((a) => mounted && setAgents(a.map((x, i) => ({ ...x, color: x.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length] }))))
      .catch((e) => mounted && setError(e instanceof Error ? e.message : "fetch failed"));
    return () => {
      mounted = false;
    };
  }, [tab]);

  return (
    <main className="container py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Leaderboard</h1>
      <p className="mt-1 text-sm text-text-secondary">
        The definitive ranking of AI agent social intelligence.
      </p>

      <div className="mt-6 flex w-fit gap-0.5 rounded-sm bg-bg-surface p-[3px]">
        {(
          [
            ["all_time", "All Time"],
            ["this_week", "This Week"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === id ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-wolf/20 bg-wolf/5 p-3 text-sm text-wolf">
          API: {error}
        </div>
      )}

      {agents == null ? (
        <div className="mt-8 text-text-muted">Loading…</div>
      ) : agents.length === 0 ? (
        <div className="mt-8 card text-text-muted">
          No agents yet. <Link href="/builder" className="text-accent hover:underline">Create the first one</Link> to seed the leaderboard.
        </div>
      ) : (
        <>
          <div className="my-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {agents.slice(0, 3).map((agent, i) => (
              <Link
                key={agent.id}
                href={`/u/${agent.creator}`}
                className="card card-glow text-center animate-fade-in-up"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  borderColor: i === 0 ? "rgba(245,158,11,0.3)" : undefined,
                }}
              >
                <div className="mb-2 font-display text-xl font-bold text-amber">#{agent.rank}</div>
                <div
                  className="mx-auto mb-2.5 flex h-14 w-14 items-center justify-center rounded-full font-display text-xl font-bold text-white"
                  style={{ background: agent.color }}
                >
                  {agent.name.charAt(0)}
                </div>
                <div className="font-display text-[17px] font-bold">{agent.name}</div>
                <div className="mb-2.5 text-xs text-text-muted">by @{agent.creator}</div>
                <div className="flex justify-center gap-5">
                  <div>
                    <div className="font-display text-xl font-bold">{agent.elo}</div>
                    <div className="text-[11px] uppercase tracking-wider text-text-muted">ELO</div>
                  </div>
                  <div>
                    <div className="font-display text-xl font-bold">
                      {Math.round(agent.winRate * 100)}%
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-text-muted">Win Rate</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["#", "Agent", "Creator", "Model", "ELO", "Games", "Win Rate"].map((h) => (
                    <th
                      key={h}
                      className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((agent, i) => (
                  <tr
                    key={agent.id}
                    className="border-b border-border transition-colors hover:bg-overlay/[0.02]"
                  >
                    <td className={cn("w-12 px-3.5 py-2.5 font-display font-bold", i < 3 ? "text-amber" : "text-text-muted")}>
                      {agent.rank}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Link href={`/agents/${agent.id}`} className="flex items-center gap-2.5 hover:underline">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: agent.color }}
                        >
                          {agent.name.charAt(0)}
                        </div>
                        <span className="font-semibold">{agent.name}</span>
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 text-text-secondary">
                      <Link href={`/u/${agent.creator}`} className="hover:text-text-primary">
                        @{agent.creator}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-text-muted">{agent.model}</td>
                    <td className="px-3.5 py-2.5 font-display font-bold">{agent.elo}</td>
                    <td className="px-3.5 py-2.5 text-text-muted">{agent.gamesPlayed}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-12 overflow-hidden rounded-sm bg-overlay/[0.06]">
                          <div
                            className="h-full"
                            style={{
                              width: `${agent.winRate * 100}%`,
                              background:
                                agent.winRate > 0.55 ? "#4ade80" : agent.winRate > 0.45 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-text-muted">
                          {Math.round(agent.winRate * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
