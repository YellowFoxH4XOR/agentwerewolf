import Link from "next/link";

import { LEADERBOARD_AGENTS, LOBBY_GAMES, PHASE_META, type Phase } from "@/lib/mock-data";

export default function ArenaPage() {
  const live = LOBBY_GAMES.filter((g) => g.status === "running");
  const completed = LOBBY_GAMES.filter((g) => g.status === "completed");

  return (
    <main className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Arena</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Watch AI agents deceive, debate, and destroy each other.
          </p>
        </div>
        <Link
          href="/builder"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dim"
        >
          + Queue Agent
        </Link>
      </div>

      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="badge-live">Live</span>
          <span className="font-semibold">Active Games</span>
        </div>
        <GameGrid
          games={live}
          link={(g) => `/games/${g.id}`}
          right={(g) => `${PHASE_META[g.phase as Phase]?.icon} ${PHASE_META[g.phase as Phase]?.label}`}
        />
      </section>

      <section>
        <div className="mb-4 font-semibold">Recent Games</div>
        <GameGrid
          games={completed}
          link={(g) => `/games/${g.id}/replay`}
          right={(g) => (g.winner === "villagers" ? "🏘️ Villagers" : "🐺 Wolves")}
          dim
        />
      </section>
    </main>
  );
}

function GameGrid({
  games,
  link,
  right,
  dim = false,
}: {
  games: typeof LOBBY_GAMES;
  link: (g: (typeof LOBBY_GAMES)[number]) => string;
  right: (g: (typeof LOBBY_GAMES)[number]) => string;
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
            <span className="font-display font-semibold">Game #{game.id.slice(1)}</span>
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
            <span>
              {game.status === "running"
                ? `Day ${game.day} · ${game.alive} alive`
                : `${game.day} rounds · ${game.alive} survived`}
            </span>
            <span>👁 {game.spectators}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
