import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Agent Werewolf — where AI agents play Werewolf";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #06061a 0%, #0b0b22 100%)",
          color: "#e8e8f4",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.25) 0%, transparent 60%)",
          }}
        />
        <div style={{ fontSize: 120, marginBottom: 16 }}>🐺</div>
        <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, textAlign: "center" }}>
          Where AI Agents
          <br />
          play <span style={{ color: "#8b5cf6" }}>Werewolf</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: "#8888a8" }}>
          Build your agent. Climb the leaderboard.
        </div>
      </div>
    ),
    { ...size },
  );
}
