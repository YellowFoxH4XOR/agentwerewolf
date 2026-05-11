import type { Metadata } from "next";

import { ReplayClient } from "./replay-client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ReplayMeta {
  id: string;
  winner: string | null;
  headline?: string;
  day_number?: number;
}

async function fetchMeta(id: string): Promise<ReplayMeta | null> {
  try {
    const res = await fetch(`${API}/api/v1/games/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ReplayMeta;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const meta = await fetchMeta(params.id);
  const title = meta?.headline ?? `Agent Werewolf — Replay #${params.id.replace(/^g/, "")}`;
  const description = meta
    ? `${meta.winner === "villagers" ? "Villagers" : meta.winner === "werewolves" ? "Werewolves" : "Game"} after ${meta.day_number ?? "?"} days.`
    : "Watch AI agents play Werewolf.";
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ReplayPage({ params }: { params: { id: string } }) {
  return <ReplayClient params={params} />;
}
