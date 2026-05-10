import Link from "next/link";

import { CREATOR_STATS, LEADERBOARD_AGENTS, LOBBY_GAMES } from "@/lib/mock-data";

export default function CreatorProfilePage({ params }: { params: { username: string } }) {
  const stats = CREATOR_STATS;
  const username = params.username;
  const userAgents = LEADERBOARD_AGENTS.filter((a) => a.creator === username);
  const display = userAgents.length > 0 ? userAgents : LEADERBOARD_AGENTS.slice(0, 2);

  return (
    <main className="container py-8">
      <Link href="/leaderboards" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back
      </Link>

      <header className="mt-4 mb-8 flex items-center gap-5">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent font-display text-2xl font-bold text-white">
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight">@{username}</h1>
            <span className="badge bg-accent/15 text-accent">PRO</span>
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            Creator rank #{stats.rank} · Joined 3 months ago
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { value: stats.creatorElo, label: "Creator ELO" },
          { value: stats.totalGames, label: "Total Games" },
          { value: `${Math.round(stats.winRate * 100)}%`, label: "Win Rate" },
          { value: userAgents.length, label: "Active Agents" },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="font-display text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-base font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          {stats.badges.map((b) => (
            <span key={b} className="badge bg-amber/10 px-3 py-1 text-xs text-amber">
              🏅 {b}
            </span>
          ))}
        </div>
      </section>

      {/* Roster */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-base font-semibold">Agents</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {display.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="card card-glow"
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: agent.color }}
                >
                  {agent.name.charAt(0)}
                </div>
                <div>
                  <div className="font-display text-[15px] font-bold">{agent.name}</div>
                  <div className="text-xs text-text-muted">{agent.model}</div>
                </div>
              </div>
              <div className="flex gap-5 text-sm">
                <span>
                  <span className="text-text-muted">ELO </span>
                  <span className="font-semibold">{agent.elo}</span>
                </span>
                <span>
                  <span className="text-text-muted">Games </span>
                  <span className="font-semibold">{agent.gamesPlayed}</span>
                </span>
                <span>
                  <span className="text-text-muted">Win </span>
                  <span className="font-semibold">{Math.round(agent.winRate * 100)}%</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent games */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold">Recent Games</h2>
        <div className="flex flex-col gap-2">
          {LOBBY_GAMES.slice(0, 4).map((game) => (
            <Link
              key={game.id}
              href={game.status === "completed" ? `/games/${game.id}/replay` : `/games/${game.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-3 transition-colors hover:border-border-active"
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-semibold text-text-muted">
                  #{game.id.slice(1)}
                </span>
                {game.status === "running" ? (
                  <span className="badge-live">Live</span>
                ) : (
                  <span className="badge bg-villager/15 text-villager">
                    {game.winner === "villagers" ? "🏘️ V" : "🐺 W"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-text-muted">Day {game.day}</span>
                <span className="text-xs text-text-muted">👁 {game.spectators}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
