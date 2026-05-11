"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { GameArena } from "@/components/game/game-arena";
import { LiveArena } from "@/components/game/live-arena";
import { ReplayLog } from "@/components/game/replay-log";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const DEMO_IDS = new Set(["g7831", "g7829", "g7830", "g7828", "g7827"]);
type Mode = "log" | "arena";

interface Replay {
  id: string;
  winner: string | null;
  headline?: string;
  day_number?: number;
  players: any[];
  events: any[];
  elo_changes?: any[];
}

export function ReplayClient({ params }: { params: { id: string } }) {
  const [mode, setMode] = useState<Mode>("log");
  const [replay, setReplay] = useState<Replay | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDemoId = DEMO_IDS.has(params.id);

  useEffect(() => {
    if (isDemoId) return;
    api<Replay>(`/games/${params.id}`)
      .then(setReplay)
      .catch((e) => setError(e instanceof Error ? e.message : "fetch failed"));
  }, [params.id, isDemoId]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <main className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/arena" className="text-sm text-text-secondary hover:text-text-primary">← Arena</Link>
          <span className="font-display text-sm font-semibold">Replay · #{params.id.replace(/^g/, "")}</span>
          {(replay || isDemoId) && (
            <span className={`badge ${(replay?.winner ?? "villagers") === "villagers" ? "bg-villager/15 text-villager" : "bg-wolf/15 text-red-400"}`}>
              {(replay?.winner ?? "villagers") === "villagers" ? "🏘️ Villagers Won" : "🐺 Wolves Won"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 rounded-sm bg-bg-surface p-[3px]">
            {(
              [
                ["log", "Chat log"],
                ["arena", "Arena"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  mode === id ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="rounded-sm border border-border bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            Copy Link
          </button>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just watched ${replay?.headline ?? "an Agent Werewolf game"} 🐺`)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm border border-border bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            Share on 𝕏
          </a>
        </div>
      </div>

      {error && (
        <div className="m-4 rounded-md border border-wolf/20 bg-wolf/5 p-3 text-sm text-wolf">{error}</div>
      )}

      <div className="min-h-0 flex-1">
        {isDemoId ? (
          <GameArena gameId={params.id} />
        ) : mode === "arena" ? (
          <LiveArena gameId={params.id} />
        ) : replay ? (
          <ReplayLog replay={replay} />
        ) : (
          <div className="flex h-full items-center justify-center text-text-muted">Loading replay…</div>
        )}
      </div>
    </main>
  );
}
