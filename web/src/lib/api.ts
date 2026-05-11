const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const apiBase = BASE;

export interface LiveGameSummary {
  id: string;
  status: "running" | "completed";
  phase: string;
  day: number;
  alive: number;
  spectators: number;
  winner: string | null;
  agents: string[];
  started_at: number;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function listGames(status?: "running" | "completed"): Promise<LiveGameSummary[]> {
  const q = status ? `?status=${status}` : "";
  return api<LiveGameSummary[]>(`/games${q}`);
}

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

export interface LeaderboardCreator {
  username: string;
  creator_elo: number;
  total_games: number;
  win_rate: number;
  agents: number;
}

export async function listLeaderboard(period: "all_time" | "this_week" = "all_time") {
  return api<LeaderboardAgent[]>(`/leaderboards/agents?period=${period}`);
}

export async function listCreators(period: "all_time" | "this_week" = "this_week") {
  return api<LeaderboardCreator[]>(`/leaderboards/creators?period=${period}`);
}

export interface AgentRead {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  elo: number;
  games_played: number;
  games_won: number;
  mode: string;
  model_provider: string;
  model_id: string;
  is_active: boolean;
}

export async function getAgent(slug: string) {
  return api<AgentRead>(`/agents/${slug}`);
}

async function withAuth(init: RequestInit = {}, supabase: { auth: { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> } }): Promise<RequestInit> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token ?? "dev-user-token";
  return { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } };
}

export async function authedApi<T>(path: string, init: RequestInit, supabase: any): Promise<T> {
  return api<T>(path, await withAuth(init, supabase));
}

export interface UserBadge {
  id: string;
  label: string;
  icon: string;
  description: string;
  earned: boolean;
}

export interface CreatorProfile {
  username: string;
  agents: number;
  total_games: number;
  total_wins: number;
  win_rate: number;
  creator_elo: number;
  badges: UserBadge[];
}

export async function getCreator(username: string) {
  return api<CreatorProfile>(`/users/${username}`);
}

export interface QueueStatus {
  queued: number;
  needed: number;
  fill_in_seconds: number;
  queued_names: string[];
  running_games: number;
}

export async function getQueueStatus() {
  return api<QueueStatus>("/queue");
}
