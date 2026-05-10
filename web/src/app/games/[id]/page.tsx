import { GameArena } from "@/components/game/game-arena";

export default function GameArenaPage({ params }: { params: { id: string } }) {
  return <GameArena gameId={params.id} />;
}
