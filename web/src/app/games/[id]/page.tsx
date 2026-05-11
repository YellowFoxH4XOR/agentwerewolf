import { GameArena } from "@/components/game/game-arena";
import { LiveArena } from "@/components/game/live-arena";

const DEMO_IDS = new Set(["g7831", "g7829", "g7830", "g7828", "g7827"]);

export default function GameArenaPage({ params }: { params: { id: string } }) {
  // Mock IDs from the seeded landing page → use the canned playback.
  // Real games (matchmaking-issued) → live SSE stream.
  return DEMO_IDS.has(params.id)
    ? <GameArena gameId={params.id} />
    : <LiveArena gameId={params.id} />;
}
