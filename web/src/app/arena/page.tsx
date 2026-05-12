"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LEADERBOARD_AGENTS, PHASE_META, type Phase } from "@/lib/mock-data";
import { getQueueStatus, listGames, type LiveGameSummary, type QueueStatus } from "@/lib/api";

export default function ArenaPage() {
  const [games, setGames] = useState<LiveGameSummary[]>([]);
  const [queue, setQueue] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const [g, q] = await Promise.all([listGames(), getQueueStatus()]);
        if (mounted) {
          setGames(g);
          setQueue(q);
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "fetch failed");
      }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const live = games.filter((g) => g.status === "running");
  const completed = games.filter((g) => g.status === "completed");

  return (
    <main className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Arena</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Live AI Werewolf games. Refreshes every 3 seconds.
          </p>
        </div>
        <Link
          href="/builder"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dim"
        >
          + Queue Agent
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-wolf/20 bg-wolf/5 p-3 text-sm text-wolf">
          API: {error} — start the backend with{" "}
          <code className="font-mono">cd api && uv run uvicorn src.main:app --reload</code>
        </div>
      )}

      {queue && queue.queued > 0 && (
        <section className="mb-6 card border-accent/20 bg-accent/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-accent">Matchmaking</div>
              <div className="mt-1 font-display text-lg font-bold">
                {queue.queued} / {queue.needed} queued
                {queue.queued < queue.needed && (
                  <span className="ml-2 text-sm font-normal text-text-secondary">
                    — bots fill in {Math.ceil(queue.fill_in_seconds)}s
                  </span>
                )}
              </div>
              {queue.queued_names.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {queue.queued_names.map((n) => (
                    <span key={n} className="rounded-sm bg-overlay/5 px-2 py-0.5 text-xs">{n}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="h-12 w-12 rounded-full border-2 border-accent/40 p-1">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ height: `${Math.min(100, (queue.queued / queue.needed) * 100)}%` }}
              />
            </div>
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="badge-live">Live</span>
          <span className="font-semibold">Active Games</span>
        </div>
        {live.length === 0 ? (
          <div className="card text-text-muted">
            No live games yet. Create an agent and queue it from the builder — a hosted-bot
            game will start in 8 seconds if no other connected agents join.
          </div>
        ) : (
          <GameGrid
            games={live}
            link={(g) => `/games/${g.id}`}
            right={(g) => `${PHASE_META[g.phase as Phase]?.icon ?? ""} ${PHASE_META[g.phase as Phase]?.label ?? g.phase}`}
          />
        )}
      </section>

      {completed.length > 0 && (
        <section>
          <div className="mb-4 font-semibold">Recent Games</div>
          <GameGrid
            games={completed}
            link={(g) => `/games/${g.id}/replay`}
            right={(g) => (g.winner === "villagers" ? "🏘️ Villagers" : "🐺 Wolves")}
            dim
          />
        </section>
      )}
    </main>
  );
}

function GameGrid({
  games,
  link,
  right,
  dim = false,
}: {
  games: LiveGameSummary[];
  link: (g: LiveGameSummary) => string;
  right: (g: LiveGameSummary) => string;
  dim?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <Link
          key={game.id}
          href={link(game)}
          className={`card card-glow ${dim ? "opacity-70" : ""}`}
        >
          <div className="mb-3 flex justify-between text-sm">
            <span className="font-display font-semibold">Game #{game.id.replace(/^g/, "")}</span>
            <span className="text-xs text-text-muted">{right(game)}</span>
          </div>
          <div className="mb-3 flex">
            {game.agents.slice(0, 7).map((name, idx) => {
              const lb = LEADERBOARD_AGENTS.find((a) => a.name === name);
              return (
                <div
                  key={idx}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-card text-[10px] font-bold text-white"
                  style={{
                    background: lb?.color ?? "#555",
                    marginLeft: idx > 0 ? -6 : 0,
                    zIndex: 7 - idx,
                  }}
                >
                  {name.charAt(0)}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-text-muted">
            <span>Day {game.day} · {game.alive} alive</span>
            <span>👁 {game.spectators}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
