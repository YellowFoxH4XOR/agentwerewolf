"use client";

import { useEffect, useRef, useState } from "react";

import { PHASE_META, ROLE_COLORS, ROLE_ICONS, type Phase } from "@/lib/mock-data";
import { apiBase } from "@/lib/api";

type Role = "villager" | "werewolf" | "seer" | "doctor";

interface PlayerSnap {
  agent_id: string;
  name: string;
  seat: number;
  role: Role;
  alive: boolean;
  eliminated_day: number | null;
}

interface EventSnap {
  sequence: number;
  phase: Phase | "system";
  day: number;
  actor: string | null;
  action: string;
  target: string | null;
  content: string | null;
}

interface Snapshot {
  id: string;
  phase: Phase | "game_over";
  day_number: number;
  winner: string | null;
  players: PlayerSnap[];
  events: EventSnap[];
}

const COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#14b8a6",
  "#f59e0b", "#ec4899", "#94a3b8",
];

function position(index: number, total: number, rx: number, ry: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  // For odd seat counts, seat 0 sits at the top (sin = -1) but no seat
  // reaches the bottom (sin maxes at cos(π/total) < 1). Shift every seat
  // down by half the bbox asymmetry so the visual midline of all seats
  // coincides with the container center — that's where the phase label
  // is pinned, and the user reads "middle of all players" off the bbox.
  let sMin = Infinity, sMax = -Infinity;
  for (let k = 0; k < total; k++) {
    const s = Math.sin((k / total) * 2 * Math.PI - Math.PI / 2);
    if (s < sMin) sMin = s;
    if (s > sMax) sMax = s;
  }
  const yShift = -ry * (sMin + sMax) / 2;
  return { x: rx * Math.cos(angle), y: ry * Math.sin(angle) + yShift };
}

export function LiveArena({ gameId }: { gameId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<EventSnap[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spectators, setSpectators] = useState(1);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`${apiBase}/api/v1/games/${gameId}/stream`);

    es.onmessage = (msg) => {
      const m = JSON.parse(msg.data);
      if (m.type === "snapshot") {
        setSnapshot(m.data);
        setEvents(m.data.events ?? []);
      } else if (m.type === "event") {
        const ev: EventSnap = m.data;
        setEvents((prev) => [...prev, ev]);
        if (ev.action === "eliminated") {
          setSnapshot((s) => s ? {
            ...s,
            players: s.players.map((p) => p.name === ev.target ? { ...p, alive: false, eliminated_day: ev.day } : p),
          } : s);
        }
      } else if (m.type === "phase_change") {
        setSnapshot((s) => s ? { ...s, phase: m.data.phase, day_number: m.data.day } : s);
      } else if (m.type === "game_over") {
        setWinner(m.data.winner);
        es.close();
      }
    };

    es.onerror = () => {
      setError("disconnected");
      es.close();
    };

    return () => es.close();
  }, [gameId]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [events.length]);

  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-deep text-text-muted">
        {error ? (
          <div className="text-center">
            <div className="mb-2 text-wolf">Couldn&apos;t connect to {gameId}.</div>
            <div className="text-xs">Game may not exist yet, or the API isn&apos;t running.</div>
          </div>
        ) : "Connecting…"}
      </div>
    );
  }

  const phase = snapshot.phase as Phase;
  const phaseBg =
    phase === "night"
      ? "radial-gradient(ellipse at 50% 30%, #0e0e3a 0%, #06061a 100%)"
      : phase === "day_vote"
        ? "radial-gradient(ellipse at 50% 30%, #1a1208 0%, #0a0806 100%)"
        : "radial-gradient(ellipse at 50% 30%, #141208 0%, #0a0806 100%)";

  const lastSpeechByName: Record<string, number> = {};
  events.forEach((e) => { if (e.action === "speak" && e.actor) lastSpeechByName[e.actor] = e.sequence; });
  const lastSeq = events[events.length - 1]?.sequence ?? 0;
  const recentSpeaker = Object.entries(lastSpeechByName).find(([, seq]) => lastSeq - seq < 3)?.[0] ?? null;
  const lastVote: Record<string, string | null> = {};
  for (const e of events) {
    if (e.action === "vote" && e.actor && (e.phase as string) === "day_vote") lastVote[e.actor] = e.target;
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col transition-[background] duration-1000"
      style={{ background: phaseBg }}
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <span className={winner ? "badge bg-villager/15 text-villager" : "badge-live"}>
            {winner ? winner === "villagers" ? "🏘️ V" : "🐺 W" : "Live"}
          </span>
          <span className="font-display text-sm font-semibold">Game #{gameId.replace(/^g/, "")}</span>
          <span className="text-sm text-text-muted">
            {PHASE_META[phase]?.icon ?? "🐺"} {PHASE_META[phase]?.label ?? phase} · Day {snapshot.day_number}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>👁 {spectators} watching</span>
          <span>{snapshot.players.filter((p) => p.alive).length}/{snapshot.players.length} alive</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative flex flex-1 items-center justify-center p-6">
          <div className="relative h-[480px] w-[560px]">
            {snapshot.players.map((p, i) => {
              const pos = position(i, snapshot.players.length, 230, 200);
              const dead = !p.alive;
              const speaking = recentSpeaker === p.name;
              const color = COLORS[i % COLORS.length];
              return (
                <div
                  key={p.agent_id}
                  className="absolute left-1/2 top-1/2 transition-all duration-500"
                  style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
                >
                  <div
                    className={`flex flex-col items-center gap-1.5 transition-all ${
                      dead ? "opacity-35 grayscale" : ""
                    } ${speaking ? "animate-breathe" : !dead ? "animate-float" : ""}`}
                    style={{ animationDelay: `${i * 0.3}s` }}
                  >
                    <div
                      className="relative flex h-16 w-16 items-center justify-center rounded-full font-display text-xl font-bold text-white transition-all"
                      style={{
                        background: color,
                        border: speaking ? `3px solid ${color}` : "3px solid transparent",
                        boxShadow: speaking ? `0 0 20px ${color}60` : "none",
                      }}
                    >
                      {p.name.charAt(0)}
                      {dead && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-2xl">
                          ☠️
                        </div>
                      )}
                      {speaking && (
                        <div className="absolute -right-1 -top-1 h-4 w-4 animate-pulse-soft rounded-full border-2 border-bg-deep bg-villager" />
                      )}
                    </div>
                    <div className={`whitespace-nowrap text-center font-display text-xs font-semibold ${dead ? "text-text-muted" : "text-text-primary"}`}>
                      {p.name}
                    </div>
                    {(dead || winner) && (
                      <div
                        className="badge"
                        style={{
                          background: `${ROLE_COLORS[p.role]}20`,
                          color: ROLE_COLORS[p.role],
                        }}
                      >
                        {ROLE_ICONS[p.role]} {p.role}
                      </div>
                    )}
                    {p.name in lastVote && !dead && (
                      <div className="animate-fade-in text-[10px] font-semibold text-amber">
                        voted {lastVote[p.name] ? `→ ${lastVote[p.name]}` : "(abstain)"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Outer = centering translate, inner = scale-in animation.
                They have to be nested because both want to write `transform`
                and the `fill-mode: both` animation overrides the centering. */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex animate-phase-reveal flex-col items-center gap-2 text-center">
                <div className="text-4xl">{PHASE_META[phase]?.icon ?? "🐺"}</div>
                <div className="font-display text-[15px] font-bold uppercase tracking-[1.5px]">
                  {PHASE_META[phase]?.label ?? phase}
                </div>
                <div className="font-display text-xs tracking-widest text-text-muted">Day {snapshot.day_number}</div>
              </div>
            </div>
          </div>

          {winner && (
            <div className="absolute inset-0 z-10 flex animate-fade-in items-center justify-center bg-bg-deep/85 backdrop-blur-md">
              <div className="animate-fade-in-up text-center">
                <div className="mb-3 text-6xl">{winner === "villagers" ? "🏆" : "🐺"}</div>
                <div className="mb-2 font-display text-3xl font-bold tracking-tight">
                  {winner === "villagers" ? "Villagers Win!" : "Werewolves Win!"}
                </div>
                <div className="text-sm text-text-secondary">All werewolves found.</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex w-[380px] flex-col border-l border-border bg-black/15">
          <div className="border-b border-border px-4 py-3 font-display text-sm font-semibold text-text-secondary">
            Game Feed · {events.length} events
          </div>
          <div ref={feedRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
            {events
              .filter((e) => ["speak", "system_announce", "eliminated"].includes(e.action))
              .map((ev, i) => {
                if (ev.action === "system_announce") {
                  return (
                    <div key={i} className="animate-fade-in rounded-sm bg-white/[0.03] px-3 py-2 text-center text-sm text-text-secondary">
                      {ev.content}
                    </div>
                  );
                }
                if (ev.action === "eliminated") {
                  return (
                    <div key={i} className="animate-fade-in rounded-sm bg-wolf/10 px-3 py-1.5 text-center text-xs text-red-400">
                      ☠️ {ev.target} eliminated
                    </div>
                  );
                }
                const p = snapshot.players.find((x) => x.name === ev.actor);
                const color = p ? COLORS[p.seat % COLORS.length] : "#888";
                return (
                  <div key={i} className="flex animate-slide-right items-start gap-2.5">
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: color }}
                    >
                      {ev.actor?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="mb-0.5 font-display text-xs font-semibold" style={{ color }}>
                        {ev.actor}
                      </div>
                      <div className="rounded-[2px_12px_12px_12px] bg-white/[0.03] px-3 py-2 text-sm leading-relaxed text-text-primary">
                        {ev.content}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
