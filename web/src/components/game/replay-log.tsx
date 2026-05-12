"use client";

import { ROLE_COLORS, ROLE_ICONS } from "@/lib/mock-data";

interface PlayerSnap {
  agent_id: string;
  name: string;
  seat: number;
  role: "villager" | "werewolf" | "seer" | "doctor";
  alive: boolean;
  eliminated_day: number | null;
}

interface EventSnap {
  sequence: number;
  phase: "night" | "day_discussion" | "day_vote" | "system";
  day_number?: number;
  day?: number;
  actor: string | null;
  action: string;
  target: string | null;
  content: string | null;
}

interface Replay {
  id: string;
  winner: string | null;
  headline?: string;
  day_number?: number;
  players: PlayerSnap[];
  events: EventSnap[];
  elo_changes?: { name: string; delta: number; elo_after: number; won: boolean }[];
}

const COLORS = ["#8b5cf6", "#6366f1", "#3b82f6", "#14b8a6", "#f59e0b", "#ec4899", "#94a3b8"];
const PHASE_LABEL: Record<string, string> = {
  night: "🌙 Night",
  day_discussion: "☀️ Day · Discussion",
  day_vote: "⚖️ Day · Vote",
};

export function ReplayLog({ replay }: { replay: Replay }) {
  const colorOf = (name: string) => {
    const seat = replay.players.find((p) => p.name === name)?.seat ?? 0;
    return COLORS[seat % COLORS.length];
  };

  // Group events by (day, phase) for header rendering.
  const groups: { day: number; phase: string; events: EventSnap[] }[] = [];
  for (const ev of replay.events) {
    const day = ev.day_number ?? ev.day ?? 0;
    const last = groups[groups.length - 1];
    if (!last || last.day !== day || last.phase !== ev.phase) {
      groups.push({ day, phase: ev.phase, events: [ev] });
    } else {
      last.events.push(ev);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        {replay.headline && (
          <div className="mb-2 font-display text-xl font-bold leading-snug">{replay.headline}</div>
        )}
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <span className={`badge ${replay.winner === "villagers" ? "bg-villager/15 text-villager" : "bg-wolf/15 text-red-400"}`}>
            {replay.winner === "villagers" ? "🏘️ Villagers" : "🐺 Werewolves"} won
          </span>
          <span>·</span>
          <span>{replay.day_number ?? "?"} days</span>
          <span>·</span>
          <span>{replay.events.length} events</span>
        </div>
      </header>

      {/* Roster strip */}
      <div className="mb-8 flex flex-wrap gap-3">
        {replay.players.map((p) => (
          <div
            key={p.agent_id}
            className={`flex items-center gap-2 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs ${
              p.alive ? "" : "opacity-60"
            }`}
          >
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: colorOf(p.name) }}
            >
              {p.name.charAt(0)}
            </div>
            <span className="font-semibold">{p.name}</span>
            <span className="badge" style={{ background: `${ROLE_COLORS[p.role]}20`, color: ROLE_COLORS[p.role] }}>
              {ROLE_ICONS[p.role]} {p.role}
            </span>
            {!p.alive && <span className="text-text-muted">d{p.eliminated_day}</span>}
          </div>
        ))}
      </div>

      {/* Chat log */}
      <div className="flex flex-col gap-6">
        {groups.map((g, gi) => (
          <section key={gi}>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <div className="font-display text-xs font-semibold uppercase tracking-widest text-text-muted">
                Day {g.day} · {PHASE_LABEL[g.phase] ?? g.phase}
              </div>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="flex flex-col gap-2.5">
              {g.events.map((ev, ei) => {
                if (ev.action === "system_announce") {
                  return (
                    <div key={ei} className="rounded-sm bg-overlay/[0.03] px-3 py-2 text-center text-sm text-text-secondary">
                      {ev.content}
                    </div>
                  );
                }
                if (ev.action === "eliminated") {
                  return (
                    <div key={ei} className="rounded-sm bg-wolf/10 px-3 py-1.5 text-center text-xs text-red-400">
                      ☠️ {ev.target} was eliminated
                    </div>
                  );
                }
                if (ev.action === "vote") {
                  const c = ev.actor ? colorOf(ev.actor) : "#888";
                  return (
                    <div key={ei} className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="font-semibold" style={{ color: c }}>{ev.actor}</span>
                      <span className="text-text-muted">voted for</span>
                      <span className="font-semibold">{ev.target ?? "(abstain)"}</span>
                    </div>
                  );
                }
                if (ev.action === "speak") {
                  const c = ev.actor ? colorOf(ev.actor) : "#888";
                  return (
                    <div key={ei} className="flex items-start gap-2.5">
                      <div
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: c }}
                      >
                        {ev.actor?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="mb-0.5 font-display text-xs font-semibold" style={{ color: c }}>
                          {ev.actor}
                        </div>
                        <div className="rounded-[2px_12px_12px_12px] bg-overlay/[0.03] px-3 py-2 text-sm leading-relaxed">
                          {ev.content}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </section>
        ))}
      </div>

      {/* ELO changes footer */}
      {replay.elo_changes && replay.elo_changes.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <div className="font-display text-xs font-semibold uppercase tracking-widest text-text-muted">
              ELO Changes
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {replay.elo_changes.map((c) => (
              <div key={c.name} className="card flex items-baseline justify-between p-3 text-sm">
                <span className="font-semibold">{c.name}</span>
                <span className={c.delta >= 0 ? "text-villager" : "text-red-400"}>
                  {c.delta >= 0 ? "+" : ""}
                  {c.delta} → {c.elo_after}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
