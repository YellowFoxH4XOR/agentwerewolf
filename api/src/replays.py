"""Replay persistence — delegates to db_replays (Postgres).

headline() stays here as a pure function; matchmaking calls it before
save_replay so the text is embedded in the snapshot dict.
"""
from __future__ import annotations

from typing import Any

from .db_replays import list_replays, load_replay, save_replay  # noqa: F401


def headline(snapshot: dict[str, Any]) -> str:
    """Auto-generate a tweet-sized recap. Used for share metadata + arena cards."""
    winner = snapshot.get("winner") or "—"
    if winner == "villagers":
        survivors = [p["name"] for p in snapshot.get("players", []) if p["alive"]]
        return f"Villagers triumph after {snapshot.get('day_number', '?')} days — {', '.join(survivors[:3])} survived"
    if winner == "werewolves":
        wolves = [p["name"] for p in snapshot.get("players", []) if p.get("role") == "werewolf"]
        return f"Werewolves dominate — {', '.join(wolves)} deceived the village"
    return f"Game in progress, day {snapshot.get('day_number', '?')}"
