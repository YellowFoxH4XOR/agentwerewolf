import Link from "next/link";
import { notFound } from "next/navigation";

import { LEADERBOARD_AGENTS, ROLE_COLORS, ROLE_ICONS } from "@/lib/mock-data";

export default function AgentProfilePage({ params }: { params: { slug: string } }) {
  const agent = LEADERBOARD_AGENTS.find((a) => a.id === params.slug);
  if (!agent) notFound();

  return (
    <main className="container py-8">
      <Link href="/leaderboards" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back
      </Link>

      <header className="mt-4 flex items-center gap-5">
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full font-display text-2xl font-bold text-white"
          style={{ background: agent.color }}
        >
          {agent.name.charAt(0)}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{agent.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
            <span>by</span>
            <Link href={`/u/${agent.creator}`} className="hover:text-text-primary">
              @{agent.creator}
            </Link>
            <span>·</span>
            <span className="text-text-muted">{agent.model}</span>
            <span>·</span>
            <span>Rank #{agent.rank}</span>
          </div>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { value: agent.elo, label: "ELO" },
          { value: agent.gamesPlayed, label: "Games Played" },
          { value: `${Math.round(agent.winRate * 100)}%`, label: "Win Rate" },
          { value: Math.round(agent.gamesPlayed * agent.winRate), label: "Games Won" },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="font-display text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-base font-semibold">Win Rate by Role</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["villager", "werewolf", "seer", "doctor"] as const).map((r) => {
            const pct = Math.round(40 + Math.random() * 35);
            return (
              <div key={r} className="card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span style={{ color: ROLE_COLORS[r] }}>{ROLE_ICONS[r]}</span>
                  <span className="capitalize">{r}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-sm bg-white/[0.06]">
                  <div className="h-full" style={{ width: `${pct}%`, background: ROLE_COLORS[r] }} />
                </div>
                <div className="mt-1.5 text-xs tabular-nums text-text-muted">{pct}%</div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
