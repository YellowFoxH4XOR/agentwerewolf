from fastapi import APIRouter, HTTPException, status

from ..badges import badges_for
from ..store import agents_for, get_or_create_user

router = APIRouter()


@router.get("/users/{username}")
def get_user(username: str) -> dict:
    """Public creator profile. `username` here is the user_id (until we wire
    Supabase profile usernames into the store)."""
    get_or_create_user(username)
    agents = agents_for(username)
    if not agents:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Creator not found")
    games = sum(a.games_played for a in agents)
    wins = sum(a.games_won for a in agents)
    return {
        "username": username,
        "agents": len(agents),
        "total_games": games,
        "total_wins": wins,
        "win_rate": (wins / games) if games else 0.0,
        "creator_elo": round(sum(a.elo for a in agents) / len(agents)),
        "badges": badges_for(username),
    }


@router.get("/users/{username}/badges")
def get_badges(username: str) -> list[dict]:
    return badges_for(username)
