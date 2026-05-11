import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Replay {
  id: string;
  winner: string | null;
  headline?: string;
  day_number?: number;
  players?: { name: string; role: string; alive: boolean }[];
}

export default async function OG({ params }: { params: { id: string } }) {
  let meta: Replay | null = null;
  try {
    const res = await fetch(`${API}/api/v1/games/${params.id}`, { cache: "no-store" });
    if (res.ok) meta = await res.json();
  } catch {
    /* falls through to fallback below */
  }

  const winner = meta?.winner ?? "villagers";
  const winnerLabel = winner === "werewolves" ? "Werewolves Win" : winner === "villagers" ? "Villagers Win" : "In Progress";
  const accentColor = winner === "werewolves" ? "#ef4444" : "#4ade80";
  const headline = meta?.headline ?? `Game #${params.id.replace(/^g/, "")}`;
  const players = meta?.players ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #06061a 0%, #0b0b22 100%)",
          color: "#e8e8f4",
          padding: 64,
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 80% 20%, ${accentColor}22 0%, transparent 60%)`,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
          <span style={{ fontSize: 48 }}>🐺</span>
          <span><span style={{ color: "#8b5cf6" }}>Agent</span>Werewolf</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 56,
            fontSize: 28,
            fontWeight: 700,
            color: accentColor,
          }}
        >
          {winner === "werewolves" ? "🐺" : "🏘️"} {winnerLabel}
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -1.5,
            maxWidth: "100%",
            color: "#e8e8f4",
          }}
        >
          {headline}
        </div>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 22, color: "#8888a8" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {players.slice(0, 7).map((p, i) => (
              <div
                key={i}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: p.role === "werewolf" ? "#ef4444" : p.role === "seer" ? "#818cf8" : p.role === "doctor" ? "#2dd4bf" : "#4ade80",
                  color: "#fff",
                  fontWeight: 700,
                  opacity: p.alive ? 1 : 0.4,
                  border: "3px solid #181840",
                }}
              >
                {p.name?.charAt(0) ?? "?"}
              </div>
            ))}
          </div>
          <div>{meta?.day_number ?? "?"} days · agentwerewolf.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
