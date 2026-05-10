// Mirrors design/prototype/data.js. Acts as the temporary data layer until the
// API + Supabase schema are live; replace these imports with `api()` calls.

export type Role = "werewolf" | "seer" | "doctor" | "villager";

export const ROLE_COLORS: Record<Role, string> = {
  werewolf: "#ef4444",
  seer: "#818cf8",
  doctor: "#2dd4bf",
  villager: "#4ade80",
};

export const ROLE_ICONS: Record<Role, string> = {
  werewolf: "🐺",
  seer: "🔮",
  doctor: "💊",
  villager: "🏘️",
};

export type Phase = "night" | "day_discussion" | "day_vote";
export const PHASE_META: Record<Phase, { label: string; icon: string }> = {
  night: { label: "Night Phase", icon: "🌙" },
  day_discussion: { label: "Discussion", icon: "☀️" },
  day_vote: { label: "Village Vote", icon: "⚖️" },
};

export interface Agent {
  id: string;
  name: string;
  color: string;
  grad: string;
  role: Role;
  personality: string;
  model: string;
  creator: string;
  elo: number;
}

export const GAME_AGENTS: Agent[] = [
  { id: "shadowfox",   name: "ShadowFox",   color: "#8b5cf6", grad: "linear-gradient(135deg,#7c3aed,#4f46e5)", role: "werewolf",  personality: "Cunning strategist. Builds trust before betraying.",  model: "Claude Sonnet 4.6", creator: "nyx_dev",      elo: 1847 },
  { id: "moonhowler",  name: "MoonHowler",  color: "#6366f1", grad: "linear-gradient(135deg,#4338ca,#312e81)", role: "werewolf",  personality: "Aggressive accuser. Deflects suspicion loudly.",      model: "Claude Haiku 4.5",  creator: "wolfpack",     elo: 1734 },
  { id: "truthseeker", name: "TruthSeeker", color: "#3b82f6", grad: "linear-gradient(135deg,#2563eb,#1d4ed8)", role: "seer",      personality: "Methodical analyst. Drops hints without revealing role.", model: "Claude Sonnet 4.6", creator: "verity",       elo: 1776 },
  { id: "lifeguard",   name: "LifeGuard",   color: "#14b8a6", grad: "linear-gradient(135deg,#0d9488,#0f766e)", role: "doctor",    personality: "Protective and cautious. Reads threats carefully.",   model: "Claude Sonnet 4.6", creator: "guardian_ai",  elo: 1715 },
  { id: "logicbot",    name: "LogicBot",    color: "#f59e0b", grad: "linear-gradient(135deg,#d97706,#b45309)", role: "villager",  personality: "Data-driven. Speaks in probabilities and patterns.",  model: "GPT-5.5",           creator: "datamind",     elo: 1823 },
  { id: "wildcard",    name: "Wildcard",    color: "#ec4899", grad: "linear-gradient(135deg,#db2777,#be185d)", role: "villager",  personality: "Chaotic energy. Unpredictable votes, wild accusations.", model: "Gemini Flash",      creator: "chaos_agent",  elo: 1742 },
  { id: "silentstorm", name: "SilentStorm", color: "#94a3b8", grad: "linear-gradient(135deg,#64748b,#475569)", role: "villager",  personality: "Rarely speaks. When they do, it matters.",            model: "GPT-5.5",           creator: "stormchaser",  elo: 1721 },
];

export type GameEvent =
  | { t: number; type: "phase"; phase: Phase; day: number }
  | { t: number; type: "narration"; content: string }
  | { t: number; type: "announce"; content: string }
  | { t: number; type: "speech"; agent: string; content: string }
  | { t: number; type: "vote"; agent: string; target: string | null }
  | { t: number; type: "eliminate"; agent: string }
  | { t: number; type: "game_over"; winner: "villagers" | "werewolves"; content: string };

export const GAME_TIMELINE: GameEvent[] = [
  { t: 0, type: "phase", phase: "night", day: 1 },
  { t: 1500, type: "narration", content: "The village falls silent as darkness descends…" },
  { t: 4000, type: "narration", content: "Something stirs in the shadows…" },
  { t: 7000, type: "narration", content: "Dawn approaches…" },
  { t: 8500, type: "phase", phase: "day_discussion", day: 1 },
  { t: 9000, type: "announce", content: "The village wakes to find everyone alive! The Doctor saved a life last night." },
  { t: 11000, type: "speech", agent: "logicbot", content: "A successful save on Night 1 is statistically unlikely. Either the Doctor got lucky, or they had information we don't." },
  { t: 14000, type: "speech", agent: "shadowfox", content: "Or maybe the werewolves are playing it safe. First night is always unpredictable." },
  { t: 17000, type: "speech", agent: "truthseeker", content: "I've been observing carefully. Someone here isn't what they seem. Let's see who gets nervous." },
  { t: 20000, type: "speech", agent: "moonhowler", content: "Classic deflection, TruthSeeker. Throwing vague accusations without evidence — that's exactly what a werewolf would do." },
  { t: 23000, type: "speech", agent: "wildcard", content: "EVERYONE is suspicious! I say we vote for whoever talks the most. More words = more lies!" },
  { t: 25000, type: "speech", agent: "silentstorm", content: "…" },
  { t: 26500, type: "speech", agent: "lifeguard", content: "Let's not rush to judgment. We barely have information. Another night will reveal more." },
  { t: 29000, type: "phase", phase: "day_vote", day: 1 },
  { t: 30000, type: "vote", agent: "shadowfox", target: "truthseeker" },
  { t: 31000, type: "vote", agent: "moonhowler", target: "truthseeker" },
  { t: 32000, type: "vote", agent: "truthseeker", target: "moonhowler" },
  { t: 33000, type: "vote", agent: "lifeguard", target: null },
  { t: 34000, type: "vote", agent: "logicbot", target: "moonhowler" },
  { t: 35000, type: "vote", agent: "wildcard", target: "shadowfox" },
  { t: 36000, type: "vote", agent: "silentstorm", target: "moonhowler" },
  { t: 37500, type: "announce", content: "The vote is tied — no one is eliminated. The village sleeps uneasy." },
  { t: 39500, type: "phase", phase: "night", day: 2 },
  { t: 41000, type: "narration", content: "Darkness falls once more. The wolves are hungry…" },
  { t: 44000, type: "narration", content: "A cry pierces the night…" },
  { t: 46000, type: "phase", phase: "day_discussion", day: 2 },
  { t: 46500, type: "eliminate", agent: "truthseeker" },
  { t: 47000, type: "announce", content: "☠️ TruthSeeker was found dead at dawn. They were the Seer." },
  { t: 49500, type: "speech", agent: "logicbot", content: "This confirms it — TruthSeeker was telling the truth. They found something, and the werewolves silenced them." },
  { t: 52000, type: "speech", agent: "shadowfox", content: "A tragic loss. But we can't dwell. We need to figure out who the wolves are before it's too late." },
  { t: 55000, type: "speech", agent: "moonhowler", content: "Don't look at me! Sure, I voted for TruthSeeker — but only because I thought they were bluffing!" },
  { t: 57500, type: "speech", agent: "silentstorm", content: "MoonHowler. You pushed hard against TruthSeeker from the start. You called them a bluffer. Now they're dead. Coincidence?" },
  { t: 60000, type: "speech", agent: "wildcard", content: "SilentStorm SPEAKS! And they're RIGHT! MoonHowler was WAY too aggressive yesterday. VOTE MOONHOWLER!" },
  { t: 62000, type: "speech", agent: "lifeguard", content: "I agree. The pattern is clear. MoonHowler tried to discredit the Seer before the Seer could expose them." },
  { t: 65000, type: "phase", phase: "day_vote", day: 2 },
  { t: 66000, type: "vote", agent: "shadowfox", target: "wildcard" },
  { t: 67000, type: "vote", agent: "moonhowler", target: "silentstorm" },
  { t: 68000, type: "vote", agent: "lifeguard", target: "moonhowler" },
  { t: 69000, type: "vote", agent: "logicbot", target: "moonhowler" },
  { t: 70000, type: "vote", agent: "wildcard", target: "moonhowler" },
  { t: 71000, type: "vote", agent: "silentstorm", target: "moonhowler" },
  { t: 72500, type: "eliminate", agent: "moonhowler" },
  { t: 73000, type: "announce", content: "🐺 MoonHowler has been eliminated! They were a Werewolf!" },
  { t: 75500, type: "phase", phase: "night", day: 3 },
  { t: 77000, type: "narration", content: "One wolf remains. The hunt continues…" },
  { t: 80000, type: "narration", content: "Another victim falls…" },
  { t: 82000, type: "phase", phase: "day_discussion", day: 3 },
  { t: 82500, type: "eliminate", agent: "wildcard" },
  { t: 83000, type: "announce", content: "☠️ Wildcard was found dead. They were a Villager." },
  { t: 85000, type: "speech", agent: "logicbot", content: "Four remain. One is the last werewolf. ShadowFox, LifeGuard, SilentStorm — one of you is lying." },
  { t: 87500, type: "speech", agent: "shadowfox", content: "It's not me. I've been consistent. Look at my voting pattern — I've been hunting wolves all game." },
  { t: 90000, type: "speech", agent: "lifeguard", content: "Interesting that ShadowFox voted for Wildcard yesterday instead of MoonHowler. Why protect a known wolf?" },
  { t: 92000, type: "speech", agent: "silentstorm", content: "ShadowFox voted to save MoonHowler. That's not a coincidence. They're the other wolf." },
  { t: 94000, type: "speech", agent: "shadowfox", content: "That's circumstantial! I voted for Wildcard because I genuinely thought they were suspicious!" },
  { t: 97000, type: "phase", phase: "day_vote", day: 3 },
  { t: 98000, type: "vote", agent: "shadowfox", target: "silentstorm" },
  { t: 99000, type: "vote", agent: "lifeguard", target: "shadowfox" },
  { t: 100000, type: "vote", agent: "logicbot", target: "shadowfox" },
  { t: 101000, type: "vote", agent: "silentstorm", target: "shadowfox" },
  { t: 102500, type: "eliminate", agent: "shadowfox" },
  { t: 103000, type: "announce", content: "🐺 ShadowFox has been eliminated! They were a Werewolf!" },
  { t: 105000, type: "game_over", winner: "villagers", content: "The Villagers win! All werewolves have been found." },
];

export interface LeaderboardAgent {
  rank: number;
  id: string;
  name: string;
  creator: string;
  model: string;
  elo: number;
  gamesPlayed: number;
  winRate: number;
  color: string;
}

export const LEADERBOARD_AGENTS: LeaderboardAgent[] = [
  { rank: 1,  id: "shadowfox",    name: "ShadowFox",    creator: "nyx_dev",      model: "Claude Sonnet 4.6", elo: 1847, gamesPlayed: 142, winRate: 0.63, color: "#8b5cf6" },
  { rank: 2,  id: "logicbot",     name: "LogicBot",     creator: "datamind",     model: "GPT-5.5",           elo: 1823, gamesPlayed: 198, winRate: 0.59, color: "#f59e0b" },
  { rank: 3,  id: "phantom",      name: "Phantom",      creator: "ghostcoder",   model: "Claude Haiku 4.5",  elo: 1801, gamesPlayed: 87,  winRate: 0.61, color: "#a78bfa" },
  { rank: 4,  id: "neuralninja",  name: "NeuralNinja",  creator: "aisensei",     model: "Gemini Pro",        elo: 1789, gamesPlayed: 112, winRate: 0.57, color: "#f472b6" },
  { rank: 5,  id: "truthseeker",  name: "TruthSeeker",  creator: "verity",       model: "Claude Sonnet 4.6", elo: 1776, gamesPlayed: 165, winRate: 0.55, color: "#3b82f6" },
  { rank: 6,  id: "ironclad",     name: "IronClad",     creator: "fortress_ai",  model: "GPT-5-mini",        elo: 1758, gamesPlayed: 93,  winRate: 0.58, color: "#78716c" },
  { rank: 7,  id: "wildcard",     name: "Wildcard",     creator: "chaos_agent",  model: "Gemini Flash",      elo: 1742, gamesPlayed: 204, winRate: 0.52, color: "#ec4899" },
  { rank: 8,  id: "moonhowler",   name: "MoonHowler",   creator: "wolfpack",     model: "Claude Haiku 4.5",  elo: 1734, gamesPlayed: 156, winRate: 0.54, color: "#6366f1" },
  { rank: 9,  id: "silentstorm",  name: "SilentStorm",  creator: "stormchaser",  model: "GPT-5.5",           elo: 1721, gamesPlayed: 78,  winRate: 0.56, color: "#94a3b8" },
  { rank: 10, id: "lifeguard",    name: "LifeGuard",    creator: "guardian_ai",  model: "Claude Sonnet 4.6", elo: 1715, gamesPlayed: 134, winRate: 0.53, color: "#14b8a6" },
  { rank: 11, id: "pixelmind",    name: "PixelMind",    creator: "px_labs",      model: "Gemini Pro",        elo: 1698, gamesPlayed: 67,  winRate: 0.51, color: "#a3e635" },
  { rank: 12, id: "strategist",   name: "Strategist",   creator: "chess_ai",     model: "GPT-5-mini",        elo: 1687, gamesPlayed: 145, winRate: 0.49, color: "#fbbf24" },
  { rank: 13, id: "chameleon",    name: "Chameleon",    creator: "adapt_ai",     model: "Claude Haiku 4.5",  elo: 1671, gamesPlayed: 89,  winRate: 0.50, color: "#34d399" },
  { rank: 14, id: "brainwave",    name: "BrainWave",    creator: "neuro_dev",    model: "Gemini Flash",      elo: 1659, gamesPlayed: 56,  winRate: 0.48, color: "#60a5fa" },
  { rank: 15, id: "sentinel",     name: "Sentinel",     creator: "watchdog_ai",  model: "GPT-5.5",           elo: 1645, gamesPlayed: 123, winRate: 0.47, color: "#fb923c" },
  { rank: 16, id: "vortex",       name: "Vortex",       creator: "spiral_dev",   model: "Claude Sonnet 4.6", elo: 1632, gamesPlayed: 34,  winRate: 0.53, color: "#c084fc" },
  { rank: 17, id: "oracle_agent", name: "Oracle",       creator: "prophecy_ai",  model: "Gemini Pro",        elo: 1618, gamesPlayed: 98,  winRate: 0.46, color: "#fde68a" },
  { rank: 18, id: "blitz",        name: "Blitz",        creator: "speed_runner", model: "Claude Haiku 4.5",  elo: 1604, gamesPlayed: 201, winRate: 0.44, color: "#f87171" },
  { rank: 19, id: "enigma",       name: "Enigma",       creator: "puzzle_ai",    model: "GPT-5-mini",        elo: 1591, gamesPlayed: 77,  winRate: 0.45, color: "#a1a1aa" },
  { rank: 20, id: "spectre",      name: "Spectre",      creator: "phantom_ops",  model: "Gemini Flash",      elo: 1578, gamesPlayed: 45,  winRate: 0.42, color: "#67e8f9" },
];

export interface LobbyGame {
  id: string;
  status: "running" | "completed";
  phase: Phase | "game_over";
  day: number;
  alive: number;
  spectators: number;
  agents: string[];
  winner?: "villagers" | "werewolves";
  featured?: boolean;
}

export const LOBBY_GAMES: LobbyGame[] = [
  { id: "g7831", status: "running",   phase: "day_vote",       day: 3, alive: 3, spectators: 127, featured: true, agents: ["ShadowFox","LogicBot","LifeGuard","Wildcard","SilentStorm","TruthSeeker","MoonHowler"] },
  { id: "g7829", status: "running",   phase: "day_discussion", day: 2, alive: 5, spectators: 42,  agents: ["Phantom","NeuralNinja","IronClad","Strategist","Chameleon","BrainWave","Sentinel"] },
  { id: "g7830", status: "running",   phase: "night",          day: 1, alive: 7, spectators: 18,  agents: ["Vortex","Oracle","Blitz","Enigma","Spectre","PixelMind","Wildcard"] },
  { id: "g7828", status: "completed", phase: "game_over",      day: 4, alive: 3, spectators: 23,  winner: "villagers",  agents: ["LogicBot","Phantom","MoonHowler","IronClad","Sentinel","Blitz","Enigma"] },
  { id: "g7827", status: "completed", phase: "game_over",      day: 5, alive: 2, spectators: 45,  winner: "werewolves", agents: ["ShadowFox","NeuralNinja","TruthSeeker","LifeGuard","Wildcard","Chameleon","BrainWave"] },
];

export const CREATOR_STATS = {
  username: "nyx_dev",
  displayName: "Nyx",
  plan: "pro" as const,
  creatorElo: 1790,
  rank: 3,
  totalGames: 284,
  totalWins: 168,
  winRate: 0.59,
  badges: ["First Win", "Master of Deception", "100 Games", "Pro Player"],
};

export function getAgent(id: string): Agent | undefined {
  return GAME_AGENTS.find((a) => a.id === id);
}

export function findLeaderboardByName(name: string): LeaderboardAgent | undefined {
  return LEADERBOARD_AGENTS.find((a) => a.name === name);
}
