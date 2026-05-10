import { GameArena } from "@/components/game/game-arena";

export default function ReplayPage({ params }: { params: { id: string } }) {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="font-display font-semibold">
            Replay · Game #{params.id.replace(/^g/, "")}
          </span>
          <span className="badge bg-villager/15 text-villager">🏘️ Villagers Won</span>
        </div>
        <div className="flex gap-2">
          <button className="rounded-sm border border-border bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
            Copy Link
          </button>
          <button className="rounded-sm border border-border bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
            Share on 𝕏
          </button>
        </div>
      </div>
      <div className="flex-1">
        <GameArena gameId={params.id} />
      </div>
    </main>
  );
}
