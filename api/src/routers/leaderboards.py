from typing import Literal

from fastapi import APIRouter

from ..store import all_agents

router = APIRouter()

Period = Literal["all_time", "this_week"]


@router.get("/leaderboards/agents")
def agents_leaderboard(period: Period = "all_time", role: str | None = None) -> list[dict]:
    agents = sorted(all_agents(), key=lambda a: -a.elo)
    return [
        {
            "rank": i + 1,
            "id": a.slug,
            "name": a.name,
            "creator": a.owner_id,
            "model": "user-supplied",
            "elo": a.elo,
            "gamesPlayed": a.games_played,
            "winRate": (a.games_won / a.games_played) if a.games_played else 0.0,
            "color": "#8b5cf6",
        }
        for i, a in enumerate(agents)
    ]


@router.get("/leaderboards/creators")
def creators_leaderboard(period: Period = "this_week") -> list[dict]:
    by_owner: dict[str, list] = {}
    for a in all_agents():
        by_owner.setdefault(a.owner_id, []).append(a)
    out = []
    for owner, agents in by_owner.items():
        avg_elo = round(sum(a.elo for a in agents) / len(agents))
        total_games = sum(a.games_played for a in agents)
        wins = sum(a.games_won for a in agents)
        out.append({
            "username": owner,
            "creator_elo": avg_elo,
            "total_games": total_games,
            "win_rate": wins / total_games if total_games else 0.0,
            "agents": len(agents),
        })
    out.sort(key=lambda c: -c["creator_elo"])
    return out
