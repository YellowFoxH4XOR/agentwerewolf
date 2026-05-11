"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  GAME_AGENTS,
  GAME_TIMELINE,
  PHASE_META,
  ROLE_COLORS,
  ROLE_ICONS,
  type Agent,
  type GameEvent,
  type Phase,
} from "@/lib/mock-data";

function useGamePlayback(timeline: GameEvent[], speed: number) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const startRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!playing) {
      startRef.current = null;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = (now - startRef.current) * speed;
      const next = timeRef.current + elapsed;
      startRef.current = now;
      timeRef.current = next;
      setTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  const events = useMemo(() => timeline.filter((e) => e.t <= time), [time, timeline]);
  const maxTime = timeline[timeline.length - 1]?.t ?? 0;
  const progress = maxTime > 0 ? Math.min(time / maxTime, 1) : 0;

  const seek = useCallback((t: number) => {
    timeRef.current = t;
    setTime(t);
    startRef.current = null;
  }, []);

  return { time, events, playing, setPlaying, progress, seek, maxTime };
}

function agentPosition(index: number, total: number, rx: number, ry: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return { x: rx * Math.cos(angle), y: ry * Math.sin(angle) };
}

interface SeatProps {
  agent: Agent;
  alive: boolean;
  speaking: boolean;
  voted: boolean;
  voteTarget: string | null;
  showRole: boolean;
  index: number;
  total: number;
  rx: number;
  ry: number;
}

function AgentSeat(props: SeatProps) {
  const { agent, alive, speaking, voted, voteTarget, showRole, index, total, rx, ry } = props;
  const pos = agentPosition(index, total, rx, ry);
  const dead = !alive;

  return (
    <div
      className="absolute left-1/2 top-1/2 transition-all duration-500"
      style={{
        transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
      }}
    >
      <div
        className={`flex flex-col items-center gap-1.5 transition-all ${
          dead ? "opacity-35 grayscale" : ""
        } ${speaking ? "animate-breathe" : !dead ? "animate-float" : ""}`}
        style={{ animationDelay: `${index * 0.3}s` }}
      >
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-full font-display text-xl font-bold text-white transition-all"
          style={{
            background: agent.grad,
            border: speaking ? `3px solid ${agent.color}` : "3px solid transparent",
            boxShadow: speaking ? `0 0 20px ${agent.color}60` : "none",
          }}
        >
          {agent.name.charAt(0)}
          {dead && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-2xl">
              ☠️
            </div>
          )}
          {speaking && (
            <div className="absolute -right-1 -top-1 h-4 w-4 animate-pulse-soft rounded-full border-2 border-bg-deep bg-villager" />
          )}
        </div>
        <div
          className={`whitespace-nowrap text-center font-display text-xs font-semibold ${
            dead ? "text-text-muted" : "text-text-primary"
          }`}
        >
          {agent.name}
        </div>
        {showRole && (
          <div
            className="badge"
            style={{
              background: `${ROLE_COLORS[agent.role]}20`,
              color: ROLE_COLORS[agent.role],
            }}
          >
            {ROLE_ICONS[agent.role]} {agent.role}
          </div>
        )}
        {voted && !dead && (
          <div className="animate-fade-in text-[10px] font-semibold text-amber">
            voted {voteTarget ? `→ ${voteTarget}` : "(abstain)"}
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseCenter({ phase, day, narration }: { phase: Phase; day: number; narration: string | null }) {
  const meta = PHASE_META[phase];
  return (
    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 animate-phase-reveal flex-col items-center gap-2 text-center">
      <div className="text-4xl">{meta?.icon ?? "🐺"}</div>
      <div className="font-display text-[15px] font-bold uppercase tracking-[1.5px]">
        {meta?.label}
      </div>
      <div className="font-display text-xs tracking-widest text-text-muted">Day {day}</div>
      {narration && (
        <div className="mt-1 max-w-[200px] animate-fade-in text-sm italic text-text-secondary">
          {narration}
        </div>
      )}
    </div>
  );
}

function EventFeed({ events }: { events: GameEvent[] }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const display = events.filter((e) =>
    ["speech", "announce", "game_over", "eliminate"].includes(e.type),
  );

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [display.length]);

  return (
    <div ref={feedRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
      {display.map((ev, i) => {
        if (ev.type === "announce" || ev.type === "game_over") {
          const isWin = ev.type === "game_over";
          return (
            <div
              key={i}
              className={`animate-fade-in rounded-sm px-3 py-2 text-center text-sm ${
                isWin
                  ? "border border-villager/20 bg-villager/10 font-semibold text-villager"
                  : "bg-white/[0.03] text-text-secondary"
              }`}
            >
              {ev.content}
            </div>
          );
        }
        if (ev.type === "eliminate") {
          const a = GAME_AGENTS.find((x) => x.id === ev.agent);
          return (
            <div
              key={i}
              className="animate-fade-in rounded-sm bg-wolf/10 px-3 py-1.5 text-center text-xs text-red-400"
            >
              ☠️ {a?.name ?? ev.agent} has been eliminated
            </div>
          );
        }
        if (ev.type === "speech") {
          const a = GAME_AGENTS.find((x) => x.id === ev.agent);
          if (!a) return null;
          return (
            <div key={i} className="flex animate-slide-right items-start gap-2.5">
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: a.grad }}
              >
                {a.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div
                  className="mb-0.5 font-display text-xs font-semibold"
                  style={{ color: a.color }}
                >
                  {a.name}
                </div>
                <div className="rounded-[2px_12px_12px_12px] bg-white/[0.03] px-3 py-2 text-sm leading-relaxed text-text-primary">
                  {ev.content}
                </div>
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

interface GameArenaProps {
  gameId: string;
  speed?: number;
}

export function GameArena({ gameId, speed = 1 }: GameArenaProps) {
  const { time, events, playing, setPlaying, progress, seek, maxTime } = useGamePlayback(
    GAME_TIMELINE,
    speed,
  );

  // Derive state from the events seen so far.
  const eliminated = new Set<string>();
  let currentPhase: Phase = "night";
  let currentDay = 1;
  let lastNarration: string | null = null;
  const votes: Record<string, string | null> = {};
  let speakingAgent: string | null = null;
  let gameOver: { winner: "villagers" | "werewolves" } | null = null;
  const lastSpeechTime: Record<string, number> = {};

  for (const ev of events) {
    if (ev.type === "phase") {
      currentPhase = ev.phase;
      currentDay = ev.day;
      Object.keys(votes).forEach((k) => delete votes[k]);
      lastNarration = null;
    }
    if (ev.type === "eliminate") eliminated.add(ev.agent);
    if (ev.type === "narration") lastNarration = ev.content;
    if (ev.type === "speech") {
      speakingAgent = ev.agent;
      lastSpeechTime[ev.agent] = ev.t;
    }
    if (ev.type === "vote") votes[ev.agent] = ev.target;
    if (ev.type === "game_over") gameOver = { winner: ev.winner };
  }

  const recentSpeaker =
    speakingAgent && time - (lastSpeechTime[speakingAgent] ?? 0) < 2500 ? speakingAgent : null;

  const phaseBg =
    currentPhase === "night"
      ? "radial-gradient(ellipse at 50% 30%, #0e0e3a 0%, #06061a 100%)"
      : currentPhase === "day_vote"
        ? "radial-gradient(ellipse at 50% 30%, #1a1208 0%, #0a0806 100%)"
        : "radial-gradient(ellipse at 50% 30%, #141208 0%, #0a0806 100%)";

  return (
    <div
      className="flex h-[calc(100vh-3.5rem)] flex-col transition-[background] duration-1000"
      style={{ background: phaseBg }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="badge-live">Live</span>
          <span className="font-display text-sm font-semibold">Game #{gameId.replace(/^g/, "")}</span>
          <span className="text-sm text-text-muted">
            {PHASE_META[currentPhase]?.icon} {PHASE_META[currentPhase]?.label} · Day {currentDay}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>👁 127 watching</span>
          <span>{GAME_AGENTS.length - eliminated.size}/{GAME_AGENTS.length} alive</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <div className="relative flex flex-1 items-center justify-center p-6">
          <div className="relative h-[480px] w-[560px]">
            {GAME_AGENTS.map((agent, i) => (
              <AgentSeat
                key={agent.id}
                agent={agent}
                index={i}
                total={GAME_AGENTS.length}
                rx={230}
                ry={200}
                alive={!eliminated.has(agent.id)}
                speaking={recentSpeaker === agent.id}
                voted={agent.id in votes}
                voteTarget={
                  votes[agent.id]
                    ? GAME_AGENTS.find((a) => a.id === votes[agent.id])?.name ?? null
                    : null
                }
                showRole={eliminated.has(agent.id) || !!gameOver}
              />
            ))}
            <PhaseCenter
              phase={currentPhase}
              day={currentDay}
              narration={currentPhase === "night" ? lastNarration : null}
            />
          </div>

          {gameOver && <GameOverOverlay winner={gameOver.winner} />}
        </div>

        {/* Feed */}
        <div className="flex w-[380px] flex-col border-l border-border bg-black/15">
          <div className="border-b border-border px-4 py-3 font-display text-sm font-semibold text-text-secondary">
            Game Feed
          </div>
          <EventFeed events={events} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 border-t border-border bg-black/20 px-6 py-2.5">
        <button
          onClick={() => setPlaying(!playing)}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-base text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
        >
          {playing ? "⏸" : "▶"}
        </button>
        <div
          className="relative h-1 flex-1 cursor-pointer rounded-sm bg-white/[0.06]"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            seek(pct * maxTime);
          }}
        >
          <div
            className="h-full rounded-sm bg-accent transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="w-16 text-right text-[11px] tabular-nums text-text-muted">
          {Math.floor(time / 1000)}s / {Math.floor(maxTime / 1000)}s
        </span>
        <span className="text-[11px] text-text-muted">{speed}×</span>
      </div>
    </div>
  );
}

function GameOverOverlay({ winner }: { winner: "villagers" | "werewolves" }) {
  return (
    <div className="absolute inset-0 z-10 flex animate-fade-in items-center justify-center bg-bg-deep/85 backdrop-blur-md">
      <div className="animate-fade-in-up text-center">
        <div className="mb-3 text-6xl">{winner === "villagers" ? "🏆" : "🐺"}</div>
        <div className="mb-2 font-display text-3xl font-bold tracking-tight">
          {winner === "villagers" ? "Villagers Win!" : "Werewolves Win!"}
        </div>
        <div className="text-sm text-text-secondary">
          All werewolves have been found and eliminated.
        </div>
      </div>
    </div>
  );
}
